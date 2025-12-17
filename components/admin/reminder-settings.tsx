'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const settingsSchema = z.object({
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  channel: z.enum(['EMAIL', 'SMS']),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export function ReminderSettings({ hasActiveSubscription = true }: { hasActiveSubscription?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      email: '',
      phone: '',
      channel: 'EMAIL',
    },
  })

  const channel = watch('channel')

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/reminders/settings')
        if (res.ok) {
          const data = await res.json()
          reset({
            email: data.email || '',
            phone: data.phone || '',
            channel: data.channel || 'EMAIL',
          })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setInitialLoading(false)
      }
    }
    loadSettings()
  }, [reset])

  async function onSubmit(data: SettingsFormData) {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/reminders/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to save settings')
      }

      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleTestReminder() {
    setTestLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/reminders/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to send test reminder')
      }

      const data = await res.json()
      setMessage({
        type: 'success',
        text: `Test ${data.channel} sent to ${data.to}. Check your ${data.channel === 'EMAIL' ? 'email' : 'phone'} (or console in development mode).`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setTestLoading(false)
    }
  }

  if (initialLoading) {
    return <div className="text-sm text-gray-600">Loading settings...</div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="your@email.com"
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="+1234567890"
          />
          {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="channel">Reminder Channel</Label>
          <Select value={channel} onValueChange={(value) => setValue('channel', value as 'EMAIL' | 'SMS')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {message && (
        <div
          className={`text-sm p-3 rounded ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {!hasActiveSubscription && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
          Active subscription required to manage reminder settings.{' '}
          <a href="/billing" className="underline font-medium">
            Manage subscription
          </a>
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading || !hasActiveSubscription}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button
          type="button"
          onClick={handleTestReminder}
          disabled={testLoading || !hasActiveSubscription}
          variant="outline"
        >
          {testLoading ? 'Sending...' : 'Send Test Reminder'}
        </Button>
      </div>
    </form>
  )
}

