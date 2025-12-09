import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'

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


