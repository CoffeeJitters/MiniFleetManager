import { prisma } from './prisma'
import { addDays, differenceInDays } from 'date-fns'
import { Resend } from 'resend'
import twilio from 'twilio'
import { ACTIVE_SUBSCRIPTION_STATUSES } from './middleware'

const resend = new Resend(process.env.RESEND_API_KEY)

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

/**
 * Scans all maintenance schedules and creates reminders for upcoming/overdue services
 * This would typically be run by a cron job or background worker
 */
export async function scanAndCreateReminders() {
  const now = new Date()
  const reminderDaysBefore = 7 // Send reminders 7 days before due date

  // Find all active maintenance schedules
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: {
      nextDueDate: {
        not: null,
      },
      company: {
        subscriptionStatus: {
          in: [...ACTIVE_SUBSCRIPTION_STATUSES],
        },
      },
    },
    include: {
      vehicle: {
        include: {
          company: {
            include: {
              users: {
                where: {
                  role: {
                    in: ['OWNER', 'MANAGER'],
                  },
                },
              },
            },
          },
        },
      },
      template: true,
    },
  })

  const remindersCreated: any[] = []

  for (const schedule of schedules) {
    if (!schedule.nextDueDate) continue

    const dueDate = new Date(schedule.nextDueDate)
    const daysUntilDue = differenceInDays(dueDate, now)
    const isOverdue = daysUntilDue < 0
    const isUpcoming = daysUntilDue <= reminderDaysBefore && daysUntilDue >= 0

    if (isOverdue || isUpcoming) {
      // Check if reminder already exists for this schedule and date
      const existingReminder = await prisma.reminder.findFirst({
        where: {
          scheduleId: schedule.id,
          dueDate: dueDate,
          status: {
            in: ['PENDING', 'SENT'],
          },
        },
      })

      if (!existingReminder) {
        // Create reminders for all owners/managers
        for (const user of schedule.vehicle.company.users) {
          // Email reminder
          const emailReminder = await prisma.reminder.create({
            data: {
              vehicleId: schedule.vehicleId,
              scheduleId: schedule.id,
              companyId: schedule.companyId,
              dueDate: dueDate,
              channel: 'EMAIL',
              status: 'PENDING',
            },
          })

          remindersCreated.push(emailReminder)

          // SMS reminder (if enabled)
          if (process.env.ENABLE_SMS === 'true') {
            const smsReminder = await prisma.reminder.create({
              data: {
                vehicleId: schedule.vehicleId,
                scheduleId: schedule.id,
                companyId: schedule.companyId,
                dueDate: dueDate,
                channel: 'SMS',
                status: 'PENDING',
              },
            })

            remindersCreated.push(smsReminder)
          }
        }
      }
    }
  }

  return remindersCreated
}

/**
 * Process pending reminders and send them via email/SMS
 */
export async function processPendingReminders() {
  const pendingReminders = await prisma.reminder.findMany({
    where: {
      status: 'PENDING',
      company: {
        subscriptionStatus: {
          in: [...ACTIVE_SUBSCRIPTION_STATUSES],
        },
      },
    },
    include: {
      vehicle: true,
      schedule: {
        include: {
          template: true,
        },
      },
      company: {
        include: {
          users: {
            where: {
              role: {
                in: ['OWNER', 'MANAGER'],
              },
            },
          },
        },
      },
    },
  })

  const results = []

  for (const reminder of pendingReminders) {
    try {
      if (reminder.channel === 'EMAIL') {
        await sendEmailReminder(reminder)
      } else if (reminder.channel === 'SMS') {
        await sendSMSReminder(reminder)
      }

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      })

      results.push({ id: reminder.id, status: 'sent' })
    } catch (error: any) {
      console.error(`Failed to send reminder ${reminder.id}:`, error)
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED' },
      })
      results.push({ id: reminder.id, status: 'failed', error: error.message })
    }
  }

  return results
}

/**
 * Send email reminder using Resend
 */
async function sendEmailReminder(reminder: any) {
  const vehicle = reminder.vehicle
  const template = reminder.schedule.template
  const dueDate = new Date(reminder.dueDate)

  const subject = `Maintenance Reminder: ${template.name} for ${vehicle.make} ${vehicle.model}`
  const html = `
    <h2>Maintenance Reminder</h2>
    <p><strong>Vehicle:</strong> ${vehicle.year} ${vehicle.make} ${vehicle.model}</p>
    <p><strong>Service:</strong> ${template.name}</p>
    <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
    <p>Please schedule this maintenance service.</p>
    <p><em>This is an automated reminder from MiniFleet Manager.</em></p>
  `

  const recipientEmails = reminder.company.users.map((u: any) => u.email)

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: recipientEmails,
      subject,
      html,
    })
  } catch (error: any) {
    console.error('Failed to send email reminder:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

/**
 * Send SMS reminder using Twilio
 */
async function sendSMSReminder(reminder: any) {
  const vehicle = reminder.vehicle
  const template = reminder.schedule.template
  const dueDate = new Date(reminder.dueDate)

  const message = `Maintenance reminder: ${template.name} for ${vehicle.make} ${vehicle.model} due ${dueDate.toLocaleDateString()}`

  // Get phone number from reminder settings
  const settings = await prisma.reminderSettings.findUnique({
    where: { companyId: reminder.companyId },
  })

  if (!settings?.phone) {
    throw new Error('No phone number configured for SMS reminders')
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are not configured')
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER is not set')
  }

  try {
    const result = await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: settings.phone,
      body: message,
    })
    console.log('✅ SMS reminder sent successfully!', result.sid)
    return result
  } catch (error: any) {
    console.error('Failed to send SMS reminder:', error)
    throw new Error(`Failed to send SMS: ${error.message}`)
  }
}


