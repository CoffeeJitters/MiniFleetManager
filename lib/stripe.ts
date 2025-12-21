import Stripe from 'stripe'
import { prisma } from './prisma'

// Type alias to avoid conflict with Prisma's Subscription model
type StripeSubscription = Stripe.Subscription

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
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
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Stripe is not configured. Skipping subscription sync.')
    return null
  }

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
    const stripeSubscription = await stripe.subscriptions.retrieve(company.stripeSubscriptionId) as StripeSubscription
    const cancelAtPeriodEndRaw = (stripeSubscription as any).cancel_at_period_end;
    const cancelAtRaw = (stripeSubscription as any).cancel_at; // Timestamp when subscription will be canceled
    // Check both cancel_at_period_end and cancel_at - if cancel_at is set and in future, subscription is being canceled
    const hasFutureCancelAt = cancelAtRaw && typeof cancelAtRaw === 'number' && cancelAtRaw > Math.floor(Date.now() / 1000);
    const isBeingCanceled = cancelAtPeriodEndRaw === true || hasFutureCancelAt;

    let status = STRIPE_STATUS_MAP[stripeSubscription.status] || 'CANCELED'
    
    // If subscription is canceled, always mark as CANCELED
    if (stripeSubscription.status === 'canceled') {
      status = 'CANCELED'
    }

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
      // Safely convert Unix timestamps to Date objects
      const currentPeriodStartRaw = (stripeSubscription as any).current_period_start;
      const currentPeriodEndRaw = (stripeSubscription as any).current_period_end;
      const currentPeriodStart = currentPeriodStartRaw && typeof currentPeriodStartRaw === 'number' 
        ? new Date(currentPeriodStartRaw * 1000) 
        : null;
      const currentPeriodEnd = currentPeriodEndRaw && typeof currentPeriodEndRaw === 'number' 
        ? new Date(currentPeriodEndRaw * 1000) 
        : null;
      
      // Use isBeingCanceled which checks both cancel_at_period_end and cancel_at
      const cancelAtPeriodEndValue = Boolean(isBeingCanceled);
      await prisma.subscription.update({
        where: { id: company.subscription.id },
        data: {
          status,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: cancelAtPeriodEndValue,
          stripeSubscriptionId: stripeSubscription.id, // Ensure this is always set
          ...(planId && { planId }),
        },
      })
    } else if (planId) {
      // Safely convert Unix timestamps to Date objects
      const currentPeriodStartRaw = (stripeSubscription as any).current_period_start;
      const currentPeriodEndRaw = (stripeSubscription as any).current_period_end;
      const currentPeriodStart = currentPeriodStartRaw && typeof currentPeriodStartRaw === 'number' 
        ? new Date(currentPeriodStartRaw * 1000) 
        : null;
      const currentPeriodEnd = currentPeriodEndRaw && typeof currentPeriodEndRaw === 'number' 
        ? new Date(currentPeriodEndRaw * 1000) 
        : null;
      
      await prisma.subscription.create({
        data: {
          companyId,
          planId,
          stripeSubscriptionId: stripeSubscription.id,
          status,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(isBeingCanceled),
        },
      })
    }

    // Compute return value
    const returnCurrentPeriodEndRaw = (stripeSubscription as any).current_period_end;
    const returnCurrentPeriodEnd = returnCurrentPeriodEndRaw && typeof returnCurrentPeriodEndRaw === 'number' 
      ? new Date(returnCurrentPeriodEndRaw * 1000) 
      : null;
    
    return {
      status,
      cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
      currentPeriodEnd: returnCurrentPeriodEnd,
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


