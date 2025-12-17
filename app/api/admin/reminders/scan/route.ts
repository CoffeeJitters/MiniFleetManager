import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole, hasActiveSubscription } from '@/lib/middleware'
import { scanAndCreateReminders, processPendingReminders } from '@/lib/reminders'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Only allow owners/managers to trigger reminder scans
    await requireRole(['OWNER', 'MANAGER'])

    const hasActive = await hasActiveSubscription(session.user.companyId)
    if (!hasActive) {
      return NextResponse.json(
        { message: 'Active subscription required for this action' },
        { status: 403 }
      )
    }

    const { action } = await request.json().catch(() => ({ action: 'scan' }))

    if (action === 'process') {
      const results = await processPendingReminders()
      return NextResponse.json({
        message: 'Processed pending reminders',
        results,
      })
    } else {
      // Default: scan and create reminders
      const reminders = await scanAndCreateReminders()
      return NextResponse.json({
        message: 'Reminder scan completed',
        remindersCreated: reminders.length,
      })
    }
  } catch (error: any) {
    console.error('Reminder scan error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}


