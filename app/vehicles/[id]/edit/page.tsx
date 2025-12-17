import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireRole, hasActiveSubscription } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { VehicleForm } from '@/components/vehicles/vehicle-form'

async function getVehicle(id: string, companyId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  })

  if (!vehicle || vehicle.companyId !== companyId) {
    return null
  }

  return vehicle
}

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  await requireRole(['OWNER', 'MANAGER'])

  const vehicle = await getVehicle(params.id, session.user.companyId)

  if (!vehicle) {
    redirect('/vehicles')
  }

  const hasActive = await hasActiveSubscription(session.user.companyId)

  const initialData = {
    ...vehicle,
    inServiceDate: vehicle.inServiceDate ? vehicle.inServiceDate.toISOString().split('T')[0] : '',
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Vehicle</h1>
          <p className="text-gray-600 mt-1">Update vehicle information</p>
        </div>
        <VehicleForm vehicleId={vehicle.id} initialData={initialData} hasActiveSubscription={hasActive} />
      </div>
    </DashboardLayout>
  )
}


