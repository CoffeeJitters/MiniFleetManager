import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReminderControls } from '@/components/admin/reminder-controls'

export default async function RemindersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  await requireRole(['OWNER', 'MANAGER'])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reminder System</h1>
          <p className="text-gray-600 mt-1">
            Manually trigger reminder scans and process pending reminders
          </p>
        </div>

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


