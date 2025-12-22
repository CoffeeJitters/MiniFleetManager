'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const scheduleSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  templateId: z.string().min(1, 'Template is required'),
  lastServiceDate: z.string().optional(),
  lastServiceOdometer: z.number().optional(),
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

export function ScheduleMaintenanceForm({
  vehicles,
  templates,
  defaultVehicleId,
  defaultTemplateId,
  hasActiveSubscription = true,
}: {
  vehicles: any[]
  templates: any[]
  defaultVehicleId?: string
  defaultTemplateId?: string
  hasActiveSubscription?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<string>(defaultVehicleId || '')
  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplateId || '')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      vehicleId: defaultVehicleId || '',
      templateId: defaultTemplateId || '',
    },
  })

  const selectedVehicleData = vehicles.find((v) => v.id === selectedVehicle)
  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate)

  async function onSubmit(data: ScheduleFormData) {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/maintenance/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          lastServiceOdometer: data.lastServiceOdometer || selectedVehicleData?.currentOdometer || 0,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create schedule')
      }

      router.push(`/vehicles/${data.vehicleId}`)
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
        <CardTitle>New Maintenance Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle *</Label>
            <Select
              value={selectedVehicle}
              onValueChange={(value) => {
                setSelectedVehicle(value)
                setValue('vehicleId', value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="text-sm text-red-600">{errors.vehicleId.message}</p>}
            {selectedVehicleData && (
              <p className="text-sm text-gray-600">
                Current odometer: {selectedVehicleData.currentOdometer.toLocaleString()} miles
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateId">Maintenance Template *</Label>
            <Select
              value={selectedTemplate}
              onValueChange={(value) => {
                setSelectedTemplate(value)
                setValue('templateId', value)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.isBuiltIn && ' (Built-in)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.templateId && <p className="text-sm text-red-600">{errors.templateId.message}</p>}
            {selectedTemplateData && (
              <div className="text-sm text-gray-600 space-y-1">
                {selectedTemplateData.intervalMonths && (
                  <p>Interval: Every {selectedTemplateData.intervalMonths} months</p>
                )}
                {selectedTemplateData.intervalMiles && (
                  <p>Interval: Every {selectedTemplateData.intervalMiles.toLocaleString()} miles</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastServiceDate">Last Service Date</Label>
              <Input
                id="lastServiceDate"
                type="date"
                {...register('lastServiceDate')}
              />
              <p className="text-xs text-gray-500">Leave blank to use today's date</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastServiceOdometer">Last Service Odometer (miles)</Label>
              <Input
                id="lastServiceOdometer"
                type="number"
                {...register('lastServiceOdometer', { valueAsNumber: true })}
                placeholder={selectedVehicleData?.currentOdometer.toString() || '0'}
              />
              <p className="text-xs text-gray-500">
                Defaults to current vehicle odometer if not specified
              </p>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
          )}

          {!hasActiveSubscription && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              Active subscription required to create schedules.{' '}
              <a href="/billing" className="underline font-medium">
                Manage subscription
              </a>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button type="submit" disabled={loading || !hasActiveSubscription} className="w-full sm:w-auto">
              {loading ? 'Creating...' : 'Create Schedule'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


