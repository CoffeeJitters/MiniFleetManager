'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const logServiceSchema = z.object({
  templateId: z.string().min(1, 'Template is required'),
  performedAt: z.string().min(1, 'Date is required'),
  odometerAtService: z.number().min(0, 'Odometer is required'),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
  checklistCompleted: z.boolean().default(false),
})

type LogServiceFormData = z.infer<typeof logServiceSchema>

export function LogServiceForm({
  vehicle,
  defaultTemplateId,
  hasActiveSubscription = true,
}: {
  vehicle: any
  defaultTemplateId?: string
  hasActiveSubscription?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplateId || '')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LogServiceFormData>({
    resolver: zodResolver(logServiceSchema),
    defaultValues: {
      templateId: defaultTemplateId || '',
      performedAt: new Date().toISOString().split('T')[0],
      odometerAtService: vehicle.currentOdometer,
      checklistCompleted: false,
    },
  })

  const selectedTemplateData = vehicle.maintenanceSchedules.find(
    (s: any) => s.templateId === selectedTemplate
  )?.template

  async function onSubmit(data: LogServiceFormData) {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/maintenance/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          vehicleId: vehicle.id,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to log service')
      }

      router.push(`/vehicles/${vehicle.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Record</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="templateId">Service Type *</Label>
            <Select
              value={selectedTemplate}
              onValueChange={(value) => {
                setSelectedTemplate(value)
                setValue('templateId', value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {vehicle.maintenanceSchedules.map((schedule: any) => (
                  <SelectItem key={schedule.templateId} value={schedule.templateId}>
                    {schedule.template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.templateId && <p className="text-sm text-red-600">{errors.templateId.message}</p>}
            {selectedTemplateData && selectedTemplateData.checklistItems.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium mb-2">Checklist:</p>
                <ul className="list-disc list-inside space-y-1">
                  {selectedTemplateData.checklistItems.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-600">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="performedAt">Service Date *</Label>
              <Input
                id="performedAt"
                type="date"
                {...register('performedAt')}
              />
              {errors.performedAt && (
                <p className="text-sm text-red-600">{errors.performedAt.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="odometerAtService">Odometer at Service (miles) *</Label>
              <Input
                id="odometerAtService"
                type="number"
                {...register('odometerAtService', { valueAsNumber: true })}
              />
              {errors.odometerAtService && (
                <p className="text-sm text-red-600">{errors.odometerAtService.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="performedBy">Performed By</Label>
            <Input
              id="performedBy"
              {...register('performedBy')}
              placeholder="Mechanic name or shop"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes about this service..."
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="checklistCompleted"
              {...register('checklistCompleted')}
              className="h-4 w-4"
            />
            <Label htmlFor="checklistCompleted" className="cursor-pointer">
              Checklist completed
            </Label>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
          )}

          {!hasActiveSubscription && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              Active subscription required to log services.{' '}
              <a href="/billing" className="underline font-medium">
                Manage subscription
              </a>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !hasActiveSubscription}>
              {loading ? 'Logging Service...' : 'Log Service'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


