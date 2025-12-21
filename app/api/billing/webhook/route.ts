import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe, STRIPE_STATUS_MAP } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// Type alias to avoid conflict with Prisma's Subscription model
type StripeSubscription = Stripe.Subscription

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ensure POST method is allowed
export const maxDuration = 30

// Explicitly allow POST method
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

        const stripeSubscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        ) as StripeSubscription
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

        // Safely extract period values from Stripe.Subscription
        const currentPeriodStartRaw = (stripeSubscription as any).current_period_start;
        const currentPeriodEndRaw = (stripeSubscription as any).current_period_end;
        const currentPeriodStart = currentPeriodStartRaw && typeof currentPeriodStartRaw === 'number' 
          ? new Date(currentPeriodStartRaw * 1000) 
          : null;
        const currentPeriodEnd = currentPeriodEndRaw && typeof currentPeriodEndRaw === 'number' 
          ? new Date(currentPeriodEndRaw * 1000) 
          : null;
        const cancelAtPeriodEnd = (stripeSubscription as any).cancel_at_period_end

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
        const subscriptionFromEvent = event.data.object as Stripe.Subscription
        // Retrieve full subscription from Stripe API to ensure we have all fields including cancel_at_period_end
        const subscription = await stripe.subscriptions.retrieve(subscriptionFromEvent.id) as StripeSubscription
        const cancelAtPeriodEndRaw = (subscription as any).cancel_at_period_end;
        const cancelAtRaw = (subscription as any).cancel_at; // Timestamp when subscription will be canceled
        const subscriptionStatus = subscription.status;
        const company = await prisma.company.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (!company) {
          console.error('Company not found for subscription:', subscription.id)
          break
        }

        let status = STRIPE_STATUS_MAP[subscriptionStatus] || 'CANCELED'
        
        // If subscription is canceled, always mark as CANCELED (regardless of period end)
        if (subscriptionStatus === 'canceled') {
          status = 'CANCELED'
        }

        // Get price ID to find plan
        const priceId = subscription.items.data[0]?.price.id
        let planId = company.subscriptionPlanId

        if (priceId) {
          const plan = await prisma.plan.findUnique({
            where: { stripePriceId: priceId },
          })
          if (plan) {
            planId = plan.id
          }
        }

        // Extract cancel_at_period_end - check both cancel_at_period_end and cancel_at fields
        // cancel_at is a timestamp, cancel_at_period_end is a boolean
        // If cancel_at is set and in the future, subscription is being canceled
        const cancelAtPeriodEndFromField = (subscription as any).cancel_at_period_end;
        const cancelAtTimestamp = (subscription as any).cancel_at;
        const hasFutureCancelAt = cancelAtTimestamp && typeof cancelAtTimestamp === 'number' && cancelAtTimestamp > Math.floor(Date.now() / 1000);
        const cancelAtPeriodEndValue = Boolean(cancelAtPeriodEndFromField || hasFutureCancelAt);
        
        // Update company subscription status and plan
        await prisma.company.update({
          where: { id: company.id },
          data: {
            subscriptionStatus: status,
            ...(planId && { subscriptionPlanId: planId }),
          },
        })

        // Safely convert Unix timestamps to Date objects
        const currentPeriodStartRaw = (subscription as any).current_period_start;
        const currentPeriodEndRaw = (subscription as any).current_period_end;
        const currentPeriodStart = currentPeriodStartRaw && typeof currentPeriodStartRaw === 'number' 
          ? new Date(currentPeriodStartRaw * 1000) 
          : null;
        const currentPeriodEnd = currentPeriodEndRaw && typeof currentPeriodEndRaw === 'number' 
          ? new Date(currentPeriodEndRaw * 1000) 
          : null;
        
        // Check if subscription record exists before updating
        const existingSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        })
        // Also try finding by companyId as fallback
        const subscriptionByCompany = existingSubscription || await prisma.subscription.findUnique({
          where: { companyId: company.id },
        })
        
        if (subscriptionByCompany) {
          // Update existing subscription record
          await prisma.subscription.update({
            where: { id: subscriptionByCompany.id },
            data: {
              status,
              currentPeriodStart,
              currentPeriodEnd,
              cancelAtPeriodEnd: cancelAtPeriodEndValue,
              stripeSubscriptionId: subscription.id, // Ensure this is set
              ...(planId && { planId }),
            },
          })
        } else if (planId) {
          // Create subscription record if it doesn't exist
          await prisma.subscription.create({
            data: {
              companyId: company.id,
              planId,
              stripeSubscriptionId: subscription.id,
              status,
              currentPeriodStart,
              currentPeriodEnd,
              cancelAtPeriodEnd: cancelAtPeriodEndValue,
            },
          })
        } else {
          // Try to update by companyId even without planId (for cancellation updates)
          const subscriptionByCompanyOnly = await prisma.subscription.findUnique({
            where: { companyId: company.id },
          })
          if (subscriptionByCompanyOnly) {
            await prisma.subscription.update({
              where: { id: subscriptionByCompanyOnly.id },
              data: {
                status,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd: cancelAtPeriodEndValue,
                stripeSubscriptionId: subscription.id, // Ensure this is set
              },
            })
          }
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}

