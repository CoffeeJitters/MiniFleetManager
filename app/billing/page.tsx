import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncSubscriptionStatus } from '@/lib/stripe'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BillingContent } from '@/components/billing/billing-content'

async function getBillingData(companyId: string) {
  const [company, plans, subscription] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    }),
    prisma.subscription.findUnique({
      where: { companyId },
      include: {
        plan: true,
      },
    }),
  ])

  return {
    company,
    plans,
    subscription,
  }
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  // Sync subscription status from Stripe before fetching billing data
  try {
    await syncSubscriptionStatus(session.user.companyId)
  } catch (error) {
    // Log error but don't fail the page load
    console.error('Failed to sync subscription status:', error)
  }

  const { company, plans, subscription } = await getBillingData(session.user.companyId)

  return (
    <DashboardLayout>
      <BillingContent
        company={company}
        plans={plans}
        subscription={subscription}
        userRole={session.user.role}
      />
    </DashboardLayout>
  )
}


