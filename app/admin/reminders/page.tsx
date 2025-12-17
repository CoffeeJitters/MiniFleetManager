import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole, hasActiveSubscription } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReminderControls } from '@/components/admin/reminder-controls'
import { ReminderSettings } from '@/components/admin/reminder-settings'

export default async function RemindersPage() {
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
          <h1 className="text-3xl font-bold">Reminder System</h1>
          <p className="text-gray-600 mt-1">
            Configure reminder settings and test your reminder system
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reminder Settings</CardTitle>
            <CardDescription>
              Save your email and phone number, then choose whether to send reminders via email or SMS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReminderSettings hasActiveSubscription={hasActive} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reminder Controls</CardTitle>
            <CardDescription>
              In production, reminders are automatically processed by a background job.
              Use these controls for testing or manual triggers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReminderControls />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}


