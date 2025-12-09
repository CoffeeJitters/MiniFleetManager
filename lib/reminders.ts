import { prisma } from './prisma'
import { addDays, differenceInDays } from 'date-fns'

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
 * Send email reminder (stub implementation)
 * In production, this would use a service like SendGrid, AWS SES, etc.
 */
async function sendEmailReminder(reminder: any) {
  const vehicle = reminder.vehicle
  const template = reminder.schedule.template
  const dueDate = new Date(reminder.dueDate)

  const subject = `Maintenance Reminder: ${template.name} for ${vehicle.make} ${vehicle.model}`
  const body = `
Maintenance Reminder

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
Service: ${template.name}
Due Date: ${dueDate.toLocaleDateString()}

Please schedule this maintenance service.

This is an automated reminder from MiniFleet Manager.
  `.trim()

  // Stub: In production, send actual email
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 EMAIL REMINDER (stub):')
    console.log(`To: ${reminder.company.users.map((u: any) => u.email).join(', ')}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body:\n${body}`)
  }

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // await emailService.send({
  //   to: reminder.company.users.map(u => u.email),
  //   subject,
  //   body,
  // })
}

/**
 * Send SMS reminder (stub implementation)
 * In production, this would use Twilio or similar service
 */
async function sendSMSReminder(reminder: any) {
  const vehicle = reminder.vehicle
  const template = reminder.schedule.template
  const dueDate = new Date(reminder.dueDate)

  const message = `Maintenance reminder: ${template.name} for ${vehicle.make} ${vehicle.model} due ${dueDate.toLocaleDateString()}`

  // Stub: In production, send actual SMS via Twilio
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 SMS REMINDER (stub):')
    console.log(`Message: ${message}`)
    console.log(`(Would send to phone numbers associated with company users)`)
  }

  // TODO: Integrate with SMS service (Twilio, etc.)
  // await smsService.send({
  //   to: phoneNumber,
  //   message,
  // })
}


