'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlanCard } from './plan-card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  interval: string
  stripePriceId: string
}

interface Subscription {
  id: string
  status: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  plan: Plan
}

interface Company {
  id: string
  subscriptionStatus: string
  stripeCustomerId: string | null
}

interface BillingContentProps {
  company: Company | null
  plans: Plan[]
  subscription: Subscription | null
  userRole: string
}

export function BillingContent({ company, plans, subscription, userRole }: BillingContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null)

  const isOwner = userRole === 'OWNER'
  const currentPlan = subscription?.plan
  const status = company?.subscriptionStatus || 'TRIAL'
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false
  const isCanceled = status === 'CANCELED'
  const isExpiring = cancelAtPeriodEnd && status === 'ACTIVE'
  
  // Check if subscription is past period end
  const isPastPeriodEnd = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd) < new Date()
    : false

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      router.refresh()
    }
    if (searchParams.get('canceled') === 'true') {
      // Handle cancellation if needed
    }
  }, [searchParams, router])

  const handleUpgrade = async (priceId: string) => {
    if (!isOwner) {
      alert('Only company owners can manage subscriptions')
      return
    }

    setLoading(true)
    setUpgradingPlanId(priceId)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create checkout session')
      }

      const { url } = await res.json()
      window.location.href = url
    } catch (error: any) {
      alert(error.message || 'Failed to start checkout')
      setLoading(false)
      setUpgradingPlanId(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!isOwner) {
      alert('Only company owners can manage subscriptions')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create portal session')
      }

      const { url } = await res.json()
      window.location.href = url
    } catch (error: any) {
      alert(error.message || 'Failed to open customer portal')
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    // Show "Active (Expiring)" if subscription is active but set to cancel at period end
    if (isExpiring) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <CheckCircle className="w-3 h-3" />
          Active (Expiring)
        </span>
      )
    }

    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        )
      case 'TRIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Trial
          </span>
        )
      case 'CANCELED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3" />
            Canceled
          </span>
        )
      case 'PAST_DUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Past Due
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-gray-600 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your current subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">
                    {currentPlan?.name || 'Trial Plan'}
                  </p>
                  {getStatusBadge()}
                </div>
                {currentPlan ? (
                  <p className="text-sm text-gray-600">
                    ${(currentPlan.price / 100).toFixed(2)}/{currentPlan.interval === 'month' ? 'month' : 'year'}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">Free trial period</p>
                )}
                {subscription?.currentPeriodEnd && !(isCanceled && isPastPeriodEnd) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {isCanceled || cancelAtPeriodEnd
                      ? `Expires on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                )}
                {isCanceled && isPastPeriodEnd && (
                  <p className="text-sm text-gray-500 mt-1">
                    Subscription has expired
                  </p>
                )}
              </div>
              {company?.stripeCustomerId && (
                <Button
                  onClick={handleManageSubscription}
                  disabled={loading || !isOwner}
                  variant={isCanceled ? "default" : "outline"}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : isCanceled ? (
                    'Reactivate Subscription'
                  ) : (
                    'Manage Subscription'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      {plans.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlanId={currentPlan?.id}
                isCurrentPlan={plan.id === currentPlan?.id}
                onUpgrade={handleUpgrade}
                loading={loading && upgradingPlanId === plan.stripePriceId}
              />
            ))}
          </div>
        </div>
      )}

      {plans.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center">
              No plans available at the moment. Please contact support.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


