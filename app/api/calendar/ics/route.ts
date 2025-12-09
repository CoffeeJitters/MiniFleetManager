import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireCompanyScope } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

/**
 * Generate ICS file for a maintenance schedule
 * Usage: /api/calendar/ics?scheduleId=xxx
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('scheduleId')

    if (!scheduleId) {
      return NextResponse.json({ message: 'scheduleId is required' }, { status: 400 })
    }

    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        vehicle: true,
        template: true,
      },
    })

    if (!schedule) {
      return NextResponse.json({ message: 'Schedule not found' }, { status: 404 })
    }

    requireCompanyScope(schedule.companyId, session.user.companyId)

    if (!schedule.nextDueDate) {
      return NextResponse.json({ message: 'No due date set for this schedule' }, { status: 400 })
    }

    // Generate ICS content
    const dueDate = new Date(schedule.nextDueDate)
    const startDate = format(dueDate, "yyyyMMdd'T'HHmmss")
    const endDate = format(new Date(dueDate.getTime() + 60 * 60 * 1000), "yyyyMMdd'T'HHmmss") // 1 hour event
    const created = format(new Date(), "yyyyMMdd'T'HHmmss")
    const uid = `minifleet-${schedule.id}-${dueDate.getTime()}`

    const summary = `${schedule.template.name} - ${schedule.vehicle.make} ${schedule.vehicle.model}`
    const description = `Maintenance service: ${schedule.template.name}\nVehicle: ${schedule.vehicle.year} ${schedule.vehicle.make} ${schedule.vehicle.model}\n${schedule.template.description || ''}`

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MiniFleet Manager//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${created}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${summary}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="maintenance-${schedule.id}.ics"`,
      },
    })
  } catch (error: any) {
    console.error('ICS generation error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}


