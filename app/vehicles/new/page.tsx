import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { VehicleForm } from '@/components/vehicles/vehicle-form'

export default async function NewVehiclePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  await requireRole(['OWNER', 'MANAGER'])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Add New Vehicle</h1>
          <p className="text-gray-600 mt-1">Add a vehicle to your fleet</p>
        </div>
        <VehicleForm />
      </div>
    </DashboardLayout>
  )
}


