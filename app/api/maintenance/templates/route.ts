import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole, hasActiveSubscription } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const [builtIn, custom] = await Promise.all([
      prisma.maintenanceTemplate.findMany({
        where: { isBuiltIn: true },
        orderBy: { name: 'asc' },
      }),
      prisma.maintenanceTemplate.findMany({
        where: { companyId: session.user.companyId, isBuiltIn: false },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({ builtIn, custom })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await requireRole(['OWNER', 'MANAGER'])

    const hasActive = await hasActiveSubscription(session.user.companyId)
    if (!hasActive) {
      return NextResponse.json(
        { message: 'Active subscription required for this action' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, intervalMonths, intervalMiles, checklistItems } = body

    if (!intervalMonths && !intervalMiles) {
      return NextResponse.json(
        { message: 'Either intervalMonths or intervalMiles must be provided' },
        { status: 400 }
      )
    }

    const template = await prisma.maintenanceTemplate.create({
      data: {
        name,
        description: description || null,
        intervalMonths: intervalMonths ? parseInt(intervalMonths) : null,
        intervalMiles: intervalMiles ? parseInt(intervalMiles) : null,
        checklistItems: checklistItems || [],
        isBuiltIn: false,
        companyId: session.user.companyId,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error: any) {
    console.error('Create template error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}


