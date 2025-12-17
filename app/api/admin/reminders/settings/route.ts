import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole, hasActiveSubscription } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await requireRole(['OWNER', 'MANAGER'])

    const settings = await prisma.reminderSettings.findUnique({
      where: { companyId: session.user.companyId },
    })

    return NextResponse.json(settings || { email: '', phone: '', channel: 'EMAIL' })
  } catch (error: any) {
    console.error('Get reminder settings error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await requireRole(['OWNER', 'MANAGER'])

    const hasActive = await hasActiveSubscription(session.user.companyId)
    if (!hasActive) {
      return NextResponse.json(
        { message: 'Active subscription required for this action' },
        { status: 403 }
      )
    }

    const { email, phone, channel } = await request.json()

    const settings = await prisma.reminderSettings.upsert({
      where: { companyId: session.user.companyId },
      update: {
        email: email || null,
        phone: phone || null,
        channel: channel || 'EMAIL',
      },
      create: {
        companyId: session.user.companyId,
        email: email || null,
        phone: phone || null,
        channel: channel || 'EMAIL',
      },
    })

    return NextResponse.json({ message: 'Settings saved', settings })
  } catch (error: any) {
    console.error('Save reminder settings error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}

