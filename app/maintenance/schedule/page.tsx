import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireRole, hasActiveSubscription } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ScheduleMaintenanceForm } from '@/components/maintenance/schedule-form'

async function getVehiclesAndTemplates(companyId: string) {
  const [vehicles, templates] = await Promise.all([
    prisma.vehicle.findMany({
      where: { companyId, status: 'ACTIVE' },
      orderBy: { make: 'asc' },
    }),
    prisma.maintenanceTemplate.findMany({
      where: {
        OR: [
          { isBuiltIn: true },
          { companyId },
        ],
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return { vehicles, templates }
}

export default async function ScheduleMaintenancePage({
  searchParams,
}: {
  searchParams: { vehicleId?: string; templateId?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  await requireRole(['OWNER', 'MANAGER'])

  const { vehicles, templates } = await getVehiclesAndTemplates(session.user.companyId)
  const hasActive = await hasActiveSubscription(session.user.companyId)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Schedule Maintenance</h1>
          <p className="text-gray-600 mt-1">Create a maintenance schedule for a vehicle</p>
        </div>
        <ScheduleMaintenanceForm
          vehicles={vehicles}
          templates={templates}
          defaultVehicleId={searchParams.vehicleId}
          defaultTemplateId={searchParams.templateId}
          hasActiveSubscription={hasActive}
        />
      </div>
    </DashboardLayout>
  )
}


