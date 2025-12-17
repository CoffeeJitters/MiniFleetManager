import Stripe from 'stripe'
import { prisma } from './prisma'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

export const STRIPE_STATUS_MAP: Record<string, 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'UNPAID' | 'TRIAL'> = {
  active: 'ACTIVE',
  canceled: 'CANCELED',
  past_due: 'PAST_DUE',
  unpaid: 'UNPAID',
  trialing: 'TRIAL',
}

export async function getOrCreateStripeCustomer(companyId: string, email: string, name: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (company?.stripeCustomerId) {
    return company.stripeCustomerId
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      companyId,
    },
  })

  await prisma.company.update({
    where: { id: companyId },
    data: {
      stripeCustomerId: customer.id,
    },
  })

  return customer.id
}

export async function createCheckoutSession(
  companyId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      users: {
        where: {
          role: 'OWNER',
        },
        take: 1,
      },
    },
  })

  if (!company) {
    throw new Error('Company not found')
  }

  const owner = company.users[0]
  if (!owner) {
    throw new Error('Company owner not found')
  }

  const customerId = await getOrCreateStripeCustomer(companyId, owner.email, owner.name || company.name)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      companyId,
    },
  })

  return session
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

export async function syncSubscriptionStatus(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      subscription: true,
    },
  })

  if (!company?.stripeSubscriptionId) {
    return null
  }

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(company.stripeSubscriptionId)

    const status = STRIPE_STATUS_MAP[stripeSubscription.status] || 'CANCELED'

    // Get price ID to find plan
    const priceId = stripeSubscription.items.data[0]?.price.id
    let planId = company.subscriptionPlanId

    if (priceId) {
      const plan = await prisma.plan.findUnique({
        where: { stripePriceId: priceId },
      })
      if (plan) {
        planId = plan.id
      }
    }

    // Update company subscription status
    await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: status,
        subscriptionPlanId: planId || undefined,
      },
    })

    // Update or create subscription record
    if (company.subscription) {
      await prisma.subscription.update({
        where: { id: company.subscription.id },
        data: {
          status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          ...(planId && { planId }),
        },
      })
    } else if (planId) {
      await prisma.subscription.create({
        data: {
          companyId,
          planId,
          stripeSubscriptionId: stripeSubscription.id,
          status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      })
    }

    return {
      status,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    }
  } catch (error: any) {
    // If subscription doesn't exist in Stripe, mark as canceled
    if (error.code === 'resource_missing') {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: 'CANCELED',
        },
      })

      if (company.subscription) {
        await prisma.subscription.update({
          where: { id: company.subscription.id },
          data: {
            status: 'CANCELED',
          },
        })
      }

      return {
        status: 'CANCELED' as const,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      }
    }

    throw error
  }
}


