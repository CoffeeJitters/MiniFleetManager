import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Truck, AlertTriangle, Calendar, Plus } from 'lucide-react'
import { format } from 'date-fns'

async function getDashboardData(companyId: string) {
  const [vehicles, overdueServices, upcomingServices] = await Promise.all([
    prisma.vehicle.count({
      where: { companyId, status: 'ACTIVE' },
    }),
    prisma.maintenanceSchedule.findMany({
      where: {
        companyId,
        nextDueDate: {
          lt: new Date(),
        },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 10, // Limit to 10 most recent overdue
      orderBy: { nextDueDate: 'asc' },
    }),
    prisma.maintenanceSchedule.findMany({
      where: {
        companyId,
        nextDueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 10, // Limit to 10 upcoming
      orderBy: { nextDueDate: 'asc' },
    }),
  ])

  return {
    vehicleCount: vehicles,
    overdueServices,
    upcomingServices,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  const data = await getDashboardData(session.user.companyId)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {session.user.name || session.user.email}</p>
          </div>
          {data.vehicleCount === 0 ? (
            <Link href="/vehicles/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Vehicle
              </Button>
            </Link>
          ) : (
            <Link href="/vehicles/new">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </Link>
          )}
        </div>

        {data.vehicleCount === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Start managing your fleet by adding your first vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Truck className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">
                  You don't have any vehicles yet. Add your first vehicle to get started with maintenance tracking.
                </p>
                <Link href="/vehicles/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Vehicle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.vehicleCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {data.vehicleCount >= 20 ? 'Fleet limit reached' : `${20 - data.vehicleCount} slots remaining`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue Services</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{data.overdueServices.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Requires immediate attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Services</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.upcomingServices.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Due in the next 7 days
                  </p>
                </CardContent>
              </Card>
            </div>

            {data.overdueServices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Overdue Services</CardTitle>
                  <CardDescription>
                    These services are past due and require immediate attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.overdueServices.map((schedule) => {
                      const daysOverdue = Math.floor(
                        (new Date().getTime() - new Date(schedule.nextDueDate!).getTime()) / (1000 * 60 * 60 * 24)
                      )
                      return (
                        <div
                          key={schedule.id}
                          className="flex justify-between items-center p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {schedule.vehicle.make} {schedule.vehicle.model} - {schedule.template.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Due: {format(new Date(schedule.nextDueDate!), 'MMM d, yyyy')} ({daysOverdue} days overdue)
                            </p>
                          </div>
                          <Link href={`/vehicles/${schedule.vehicleId}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.upcomingServices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Services</CardTitle>
                  <CardDescription>
                    Services due in the next 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.upcomingServices.map((schedule) => {
                      const daysUntil = Math.ceil(
                        (new Date(schedule.nextDueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      )
                      return (
                        <div
                          key={schedule.id}
                          className="flex justify-between items-center p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {schedule.vehicle.make} {schedule.vehicle.model} - {schedule.template.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Due: {format(new Date(schedule.nextDueDate!), 'MMM d, yyyy')} (in {daysUntil} days)
                            </p>
                          </div>
                          <Link href={`/vehicles/${schedule.vehicleId}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}


