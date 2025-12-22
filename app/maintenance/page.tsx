import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Wrench, Calendar, FileText, Plus } from 'lucide-react'

export default async function MaintenancePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold break-words">Maintenance</h1>
          <p className="text-gray-600 mt-1">Manage maintenance schedules and service history</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/maintenance/templates">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Templates
                </CardTitle>
                <CardDescription>
                  View and manage maintenance templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Create custom templates or use built-in ones for common services.
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/maintenance/schedule">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Maintenance
                </CardTitle>
                <CardDescription>
                  Create a new maintenance schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Set up recurring maintenance schedules for your vehicles.
                </p>
              </CardContent>
            </Link>
          </Card>

          {(session.user.role === 'OWNER' || session.user.role === 'MANAGER') && (
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href="/admin/reminders">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Reminder System
                  </CardTitle>
                  <CardDescription>
                    Manage automated reminders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Scan for upcoming services and send reminders.
                  </p>
                </CardContent>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

