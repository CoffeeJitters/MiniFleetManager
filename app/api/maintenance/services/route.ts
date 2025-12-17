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
    const {
      vehicleId,
      templateId,
      performedAt,
      odometerAtService,
      performedBy,
      notes,
      checklistCompleted,
    } = body

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

    // Create service event
    const serviceEvent = await prisma.serviceEvent.create({
      data: {
        vehicleId,
        templateId,
        companyId: session.user.companyId,
        performedAt: new Date(performedAt),
        odometerAtService: parseInt(odometerAtService),
        performedBy: performedBy || null,
        notes: notes || null,
        checklistCompleted: checklistCompleted || false,
      },
    })

    // Update vehicle odometer if service odometer is higher
    if (parseInt(odometerAtService) > vehicle.currentOdometer) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { currentOdometer: parseInt(odometerAtService) },
      })
    }

    // Update or create maintenance schedule
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: {
        vehicleId_templateId: {
          vehicleId,
          templateId,
        },
      },
    })

    const { nextDueDate, nextDueOdometer } = calculateNextDueDate(
      new Date(performedAt),
      template.intervalMonths,
      template.intervalMiles,
      parseInt(odometerAtService)
    )

    if (schedule) {
      // Update existing schedule
      await prisma.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          lastServiceDate: new Date(performedAt),
          lastServiceOdometer: parseInt(odometerAtService),
          nextDueDate,
          nextDueOdometer,
        },
      })
    } else {
      // Create new schedule
      await prisma.maintenanceSchedule.create({
        data: {
          vehicleId,
          templateId,
          companyId: session.user.companyId,
          lastServiceDate: new Date(performedAt),
          lastServiceOdometer: parseInt(odometerAtService),
          nextDueDate,
          nextDueOdometer,
        },
      })
    }

    return NextResponse.json(serviceEvent, { status: 201 })
  } catch (error: any) {
    console.error('Log service error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}


