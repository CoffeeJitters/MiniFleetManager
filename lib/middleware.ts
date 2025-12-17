import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'

export const ACTIVE_SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIAL'] as const

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth()
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Forbidden')
  }
  return session
}

export function requireCompanyScope(companyId: string, userCompanyId: string) {
  if (companyId !== userCompanyId) {
    throw new Error('Forbidden: Company scope violation')
  }
}

export async function hasActiveSubscription(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { subscriptionStatus: true },
  })
  return company ? ACTIVE_SUBSCRIPTION_STATUSES.includes(company.subscriptionStatus) : false
}


