import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole, requireCompanyScope } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
    })

    if (!vehicle) {
      return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 })
    }

    requireCompanyScope(vehicle.companyId, session.user.companyId)

    return NextResponse.json(vehicle)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await requireRole(['OWNER', 'MANAGER'])

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
    })

    if (!vehicle) {
      return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 })
    }

    requireCompanyScope(vehicle.companyId, session.user.companyId)

    const body = await request.json()
    const { make, model, year, vin, licensePlate, currentOdometer, inServiceDate, status } = body

    // Check for duplicate VIN if changed
    if (vin && vin !== vehicle.vin) {
      const existing = await prisma.vehicle.findUnique({
        where: { vin },
      })
      if (existing) {
        return NextResponse.json({ message: 'Vehicle with this VIN already exists' }, { status: 400 })
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id: params.id },
      data: {
        make,
        model,
        year: parseInt(year),
        vin: vin || null,
        licensePlate: licensePlate || null,
        currentOdometer: parseInt(currentOdometer),
        inServiceDate: inServiceDate ? new Date(inServiceDate) : null,
        status: status || 'ACTIVE',
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Update vehicle error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await requireRole(['OWNER', 'MANAGER'])

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
    })

    if (!vehicle) {
      return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 })
    }

    requireCompanyScope(vehicle.companyId, session.user.companyId)

    await prisma.vehicle.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Vehicle deleted' })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}


