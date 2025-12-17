import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe, STRIPE_STATUS_MAP } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ message: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ message: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const companyId = session.metadata?.companyId

        if (!companyId || !session.subscription) {
          console.error('Missing companyId or subscription in checkout session')
          break
        }

        const stripeSubscription = (await stripe.subscriptions.retrieve(
          session.subscription as string
        )) as Stripe.Subscription
        const priceId = stripeSubscription.items.data[0]?.price.id

        if (!priceId) {
          console.error('No price ID found in subscription')
          break
        }

        // Find or create plan
        let plan = await prisma.plan.findUnique({
          where: { stripePriceId: priceId },
        })

        if (!plan) {
          // If plan doesn't exist, create a basic one
          const price = await stripe.prices.retrieve(priceId)
          plan = await prisma.plan.create({
            data: {
              stripePriceId: priceId,
              name: (price.nickname || 'Plan') as string,
              price: price.unit_amount || 0,
              interval: price.recurring?.interval || 'month',
            },
          })
        }

        const status = STRIPE_STATUS_MAP[stripeSubscription.status] || 'ACTIVE'

        // Extract period values to ensure TypeScript recognizes them from Stripe.Subscription
        const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000)
        const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000)
        const cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end

        // Update company subscription
        await prisma.company.update({
          where: { id: companyId },
          data: {
            stripeSubscriptionId: stripeSubscription.id,
            subscriptionStatus: status,
            subscriptionPlanId: plan.id,
          },
        })

        // Create or update subscription record
        await prisma.subscription.upsert({
          where: { companyId },
          update: {
            planId: plan.id,
            stripeSubscriptionId: stripeSubscription.id,
            status,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
          },
          create: {
            companyId,
            planId: plan.id,
            stripeSubscriptionId: stripeSubscription.id,
            status,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
          },
        })

        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const stripeSubscription: Stripe.Subscription = event.data.object as Stripe.Subscription
        const company = await prisma.company.findUnique({
          where: { stripeSubscriptionId: stripeSubscription.id },
        })

        if (!company) {
          console.error('Company not found for subscription:', stripeSubscription.id)
          break
        }

        let status = STRIPE_STATUS_MAP[stripeSubscription.status] || 'CANCELED'
        
        // If subscription is canceled and we're past the period end, ensure it's marked as CANCELED
        if (stripeSubscription.status === 'canceled') {
          const periodEnd = new Date(stripeSubscription.current_period_end * 1000)
          if (periodEnd < new Date()) {
            status = 'CANCELED'
          }
        }

        // Update company subscription status
        await prisma.company.update({
          where: { id: company.id },
          data: {
            subscriptionStatus: status,
          },
        })

        // Update subscription record with all relevant fields
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSubscription.id },
          data: {
            status,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          },
        })

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

