import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Download } from 'lucide-react'

async function getUpcomingServices(companyId: string) {
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: {
      companyId,
      nextDueDate: {
        gte: new Date(),
      },
    },
    include: {
      vehicle: true,
      template: true,
    },
    orderBy: {
      nextDueDate: 'asc',
    },
    take: 50,
  })

  return schedules
}

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  const services = await getUpcomingServices(session.user.companyId)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-gray-600 mt-1">Upcoming maintenance services</p>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No upcoming services scheduled.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {services.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {schedule.template.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {schedule.vehicle.year} {schedule.vehicle.make} {schedule.vehicle.model}
                      </p>
                      {schedule.nextDueDate && (
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {format(new Date(schedule.nextDueDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <a
                      href={`/api/calendar/ics?scheduleId=${schedule.id}`}
                      download
                    >
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Add to Calendar
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


