import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { VehicleList } from '@/components/vehicles/vehicle-list'

async function getVehicles(companyId: string) {
  return await prisma.vehicle.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          maintenanceSchedules: true,
          serviceEvents: true,
        },
      },
    },
  })
}

export default async function VehiclesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  // Only Owner and Manager can manage vehicles
  if (session.user.role === 'DRIVER') {
    redirect('/dashboard')
  }

  const vehicles = await getVehicles(session.user.companyId)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Vehicles</h1>
            <p className="text-gray-600 mt-1">Manage your fleet vehicles</p>
          </div>
          {vehicles.length < 20 ? (
            <Link href="/vehicles/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </Link>
          ) : (
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Fleet Limit Reached (20 vehicles)
            </Button>
          )}
        </div>

        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">No vehicles yet. Add your first vehicle to get started.</p>
              <Link href="/vehicles/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Vehicle
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <VehicleList vehicles={vehicles} />
        )}
      </div>
    </DashboardLayout>
  )
}


