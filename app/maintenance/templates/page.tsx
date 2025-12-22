import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/middleware'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { MaintenanceTemplateList } from '@/components/maintenance/template-list'

async function getTemplates(companyId: string) {
  const [builtIn, custom] = await Promise.all([
    prisma.maintenanceTemplate.findMany({
      where: { isBuiltIn: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        intervalMonths: true,
        intervalMiles: true,
        checklistItems: true,
        isBuiltIn: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.maintenanceTemplate.findMany({
      where: { companyId, isBuiltIn: false },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        intervalMonths: true,
        intervalMiles: true,
        checklistItems: true,
        isBuiltIn: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  return { builtIn, custom }
}

export default async function MaintenanceTemplatesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  await requireRole(['OWNER', 'MANAGER'])

  const { builtIn, custom } = await getTemplates(session.user.companyId)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold break-words">Maintenance Templates</h1>
            <p className="text-gray-600 mt-1">Manage maintenance service templates</p>
          </div>
          <Link href="/maintenance/templates/new" className="self-start sm:self-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Custom Template</span>
              <span className="sm:hidden">New Template</span>
            </Button>
          </Link>
        </div>

        <MaintenanceTemplateList builtIn={builtIn} custom={custom} />
      </div>
    </DashboardLayout>
  )
}


