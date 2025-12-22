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

const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().optional(),
  licensePlate: z.string().optional(),
  currentOdometer: z.number().min(0),
  inServiceDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED']),
})

type VehicleFormData = z.infer<typeof vehicleSchema>

export function VehicleForm({
  vehicleId,
  initialData,
  hasActiveSubscription = true,
}: {
  vehicleId?: string
  initialData?: any
  hasActiveSubscription?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: initialData || {
      status: 'ACTIVE',
      currentOdometer: 0,
      year: new Date().getFullYear(),
    },
  })

  const status = watch('status')

  async function onSubmit(data: VehicleFormData) {
    setLoading(true)
    setError('')

    try {
      const url = vehicleId ? `/api/vehicles/${vehicleId}` : '/api/vehicles'
      const method = vehicleId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          inServiceDate: data.inServiceDate || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to save vehicle')
      }

      router.push('/vehicles')
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
        <CardTitle>{vehicleId ? 'Edit Vehicle' : 'New Vehicle'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make *</Label>
              <Input id="make" {...register('make')} placeholder="Ford" />
              {errors.make && <p className="text-sm text-red-600">{errors.make.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input id="model" {...register('model')} placeholder="F-150" />
              {errors.model && <p className="text-sm text-red-600">{errors.model.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                {...register('year', { valueAsNumber: true })}
                placeholder="2023"
              />
              {errors.year && <p className="text-sm text-red-600">{errors.year.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input id="vin" {...register('vin')} placeholder="1HGBH41JXMN109186" className="break-anywhere" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input id="licensePlate" {...register('licensePlate')} placeholder="ABC-1234" className="break-anywhere" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentOdometer">Current Odometer (miles) *</Label>
              <Input
                id="currentOdometer"
                type="number"
                {...register('currentOdometer', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.currentOdometer && (
                <p className="text-sm text-red-600">{errors.currentOdometer.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inServiceDate">In-Service Date</Label>
              <Input
                id="inServiceDate"
                type="date"
                {...register('inServiceDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value) => setValue('status', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="RETIRED">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
          )}

          {!hasActiveSubscription && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              Active subscription required to create or edit vehicles.{' '}
              <a href="/billing" className="underline font-medium">
                Manage subscription
              </a>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button type="submit" disabled={loading || !hasActiveSubscription} className="w-full sm:w-auto">
              {loading ? 'Saving...' : vehicleId ? 'Update Vehicle' : 'Create Vehicle'}
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


