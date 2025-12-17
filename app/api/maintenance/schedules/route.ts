import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole, requireCompanyScope, hasActiveSubscription } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { calculateNextDueDate } from '@/lib/utils'

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
    const { vehicleId, templateId, lastServiceDate, lastServiceOdometer } = body

    // Verify vehicle and template belong to company
    const [vehicle, template] = await Promise.all([
      prisma.vehicle.findUnique({ where: { id: vehicleId } }),
      prisma.maintenanceTemplate.findUnique({ where: { id: templateId } }),
    ])

    if (!vehicle || !template) {
      return NextResponse.json({ message: 'Vehicle or template not found' }, { status: 404 })
    }

    requireCompanyScope(vehicle.companyId, session.user.companyId)
    if (template.companyId && template.companyId !== session.user.companyId) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 })
    }

    // Check if schedule already exists
    const existing = await prisma.maintenanceSchedule.findUnique({
      where: {
        vehicleId_templateId: {
          vehicleId,
          templateId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { message: 'This maintenance schedule already exists for this vehicle' },
        { status: 400 }
      )
    }

    // Calculate next due date/odometer
    const serviceDate = lastServiceDate ? new Date(lastServiceDate) : new Date()
    const serviceOdometer = lastServiceOdometer || vehicle.currentOdometer

    const { nextDueDate, nextDueOdometer } = calculateNextDueDate(
      serviceDate,
      template.intervalMonths,
      template.intervalMiles,
      serviceOdometer
    )

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        vehicleId,
        templateId,
        companyId: session.user.companyId,
        lastServiceDate: serviceDate,
        lastServiceOdometer: serviceOdometer,
        nextDueDate,
        nextDueOdometer,
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error: any) {
    console.error('Create schedule error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}


