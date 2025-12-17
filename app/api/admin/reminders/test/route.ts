import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole, hasActiveSubscription } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import twilio from 'twilio'

const resend = new Resend(process.env.RESEND_API_KEY)

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

async function sendTestEmail(email: string) {
  const subject = 'Test Reminder from MiniFleet Manager'
  const html = `
    <p>This is a test reminder from MiniFleet Manager.</p>
    <p>If you received this email, your reminder system is configured correctly.</p>
    <p>This is an automated test message.</p>
  `

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject,
      html,
    })
  } catch (error: any) {
    console.error('Failed to send email:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

async function sendTestSMS(phone: string) {
  const message = 'Test reminder from MiniFleet Manager. Your reminder system is configured correctly.'

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file.')
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER is not set in your .env file.')
  }

  try {
    const result = await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
      body: message,
    })
    console.log('✅ SMS sent successfully!', result.sid)
    return result
  } catch (error: any) {
    console.error('❌ Failed to send SMS:', error)
    throw new Error(`Failed to send SMS: ${error.message}`)
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

    const settings = await prisma.reminderSettings.findUnique({
      where: { companyId: session.user.companyId },
    })

    if (!settings) {
      return NextResponse.json({ message: 'Please save your reminder settings first' }, { status: 400 })
    }

    if (settings.channel === 'EMAIL') {
      if (!settings.email) {
        return NextResponse.json({ message: 'Email address is required' }, { status: 400 })
      }
      await sendTestEmail(settings.email)
      return NextResponse.json({ message: 'Test email sent', channel: 'EMAIL', to: settings.email })
    } else if (settings.channel === 'SMS') {
      if (!settings.phone) {
        return NextResponse.json({ message: 'Phone number is required' }, { status: 400 })
      }
      await sendTestSMS(settings.phone)
      return NextResponse.json({ message: 'Test SMS sent', channel: 'SMS', to: settings.phone })
    }

    return NextResponse.json({ message: 'Invalid channel' }, { status: 400 })
  } catch (error: any) {
    console.error('Send test reminder error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}

