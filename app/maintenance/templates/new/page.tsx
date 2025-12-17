import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole, hasActiveSubscription } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MaintenanceTemplateForm } from '@/components/maintenance/template-form'

export default async function NewTemplatePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  await requireRole(['OWNER', 'MANAGER'])

  const hasActive = await hasActiveSubscription(session.user.companyId)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Maintenance Template</h1>
          <p className="text-gray-600 mt-1">Create a custom maintenance template for your company</p>
        </div>
        <MaintenanceTemplateForm hasActiveSubscription={hasActive} />
      </div>
    </DashboardLayout>
  )
}


