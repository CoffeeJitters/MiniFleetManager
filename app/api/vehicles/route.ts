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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          vin: true,
          licensePlate: true,
          currentOdometer: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.vehicle.count({
        where: { companyId: session.user.companyId },
      }),
    ])

    return NextResponse.json({
      vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
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

    // Check fleet size limit
    const vehicleCount = await prisma.vehicle.count({
      where: { companyId: session.user.companyId },
    })

    if (vehicleCount >= 20) {
      return NextResponse.json(
        { message: 'Fleet size limit reached (20 vehicles)' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { make, model, year, vin, licensePlate, currentOdometer, inServiceDate, status } = body

    // Check for duplicate VIN if provided
    if (vin) {
      const existing = await prisma.vehicle.findUnique({
        where: { vin },
      })
      if (existing) {
        return NextResponse.json({ message: 'Vehicle with this VIN already exists' }, { status: 400 })
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        make,
        model,
        year: parseInt(year),
        vin: vin || null,
        licensePlate: licensePlate || null,
        currentOdometer: parseInt(currentOdometer),
        inServiceDate: inServiceDate ? new Date(inServiceDate) : null,
        status: status || 'ACTIVE',
        companyId: session.user.companyId,
      },
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error: any) {
    console.error('Create vehicle error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}


