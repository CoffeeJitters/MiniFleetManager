import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCompanyScope } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit, Plus, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { VehicleDetail } from '@/components/vehicles/vehicle-detail'

async function getVehicle(id: string, companyId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      maintenanceSchedules: {
        include: {
          template: true,
        },
        orderBy: { nextDueDate: 'asc' },
      },
      serviceEvents: {
        include: {
          template: true,
        },
        orderBy: { performedAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!vehicle || vehicle.companyId !== companyId) {
    return null
  }

  return vehicle
}

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  const vehicle = await getVehicle(params.id, session.user.companyId)

  if (!vehicle) {
    redirect('/vehicles')
  }

  const canEdit = session.user.role === 'OWNER' || session.user.role === 'MANAGER'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-gray-600 mt-1">
              {vehicle.licensePlate && `Plate: ${vehicle.licensePlate} • `}
              {vehicle.vin && `VIN: ${vehicle.vin}`}
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Link href={`/vehicles/${vehicle.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Link href={`/maintenance/schedule?vehicleId=${vehicle.id}`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
              </Link>
            </div>
          )}
        </div>

        <VehicleDetail vehicle={vehicle} canEdit={canEdit} />
      </div>
    </DashboardLayout>
  )
}


