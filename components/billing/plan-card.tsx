'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  interval: string
  stripePriceId: string
}

interface PlanCardProps {
  plan: Plan
  currentPlanId?: string
  isCurrentPlan: boolean
  onUpgrade: (priceId: string) => void
  loading?: boolean
}

export function PlanCard({ plan, isCurrentPlan, onUpgrade, loading }: PlanCardProps) {
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatInterval = (interval: string) => {
    return interval === 'month' ? 'month' : 'year'
  }

  return (
    <Card className={isCurrentPlan ? 'border-primary border-2' : ''}>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description || 'Professional plan for your fleet'}</CardDescription>
        <div className="mt-4">
          <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
          <span className="text-gray-600">/{formatInterval(plan.interval)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={() => onUpgrade(plan.stripePriceId)}
          disabled={isCurrentPlan || loading}
          variant={isCurrentPlan ? 'outline' : 'default'}
        >
          {isCurrentPlan ? 'Current Plan' : loading ? 'Processing...' : 'Upgrade'}
        </Button>
      </CardContent>
    </Card>
  )
}


