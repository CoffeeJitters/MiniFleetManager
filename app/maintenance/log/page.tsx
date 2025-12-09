import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { LogServiceForm } from '@/components/maintenance/log-service-form'

async function getVehicleAndSchedules(vehicleId: string, companyId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      maintenanceSchedules: {
        include: {
          template: true,
        },
      },
    },
  })

  if (!vehicle || vehicle.companyId !== companyId) {
    return null
  }

  return vehicle
}

export default async function LogServicePage({
  searchParams,
}: {
  searchParams: { vehicleId?: string; templateId?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  await requireRole(['OWNER', 'MANAGER'])

  if (!searchParams.vehicleId) {
    redirect('/vehicles')
  }

  const vehicle = await getVehicleAndSchedules(searchParams.vehicleId, session.user.companyId)

  if (!vehicle) {
    redirect('/vehicles')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Log Service</h1>
          <p className="text-gray-600 mt-1">
            Record a completed maintenance service for {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
        </div>
        <LogServiceForm
          vehicle={vehicle}
          defaultTemplateId={searchParams.templateId}
        />
      </div>
    </DashboardLayout>
  )
}


