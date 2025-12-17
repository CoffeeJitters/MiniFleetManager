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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X } from 'lucide-react'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  intervalMonths: z.number().min(0).optional().nullable(),
  intervalMiles: z.number().min(0).optional().nullable(),
  checklistItems: z.array(z.string()).default([]),
})

type TemplateFormData = z.infer<typeof templateSchema>

export function MaintenanceTemplateForm({
  templateId,
  initialData,
  hasActiveSubscription = true,
}: {
  templateId?: string
  initialData?: any
  hasActiveSubscription?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checklistItem, setChecklistItem] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: initialData || {
      checklistItems: [],
    },
  })

  const checklistItems = watch('checklistItems') || []

  function addChecklistItem() {
    if (checklistItem.trim()) {
      const current = checklistItems
      setValue('checklistItems', [...current, checklistItem.trim()])
      setChecklistItem('')
    }
  }

  function removeChecklistItem(index: number) {
    const current = checklistItems
    setValue('checklistItems', current.filter((_, i) => i !== index))
  }

  async function onSubmit(data: TemplateFormData) {
    setLoading(true)
    setError('')

    // Ensure at least one interval is set
    if (!data.intervalMonths && !data.intervalMiles) {
      setError('Please specify either a time interval or mileage interval')
      setLoading(false)
      return
    }

    try {
      const url = templateId ? `/api/maintenance/templates/${templateId}` : '/api/maintenance/templates'
      const method = templateId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          intervalMonths: data.intervalMonths || null,
          intervalMiles: data.intervalMiles || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to save template')
      }

      router.push('/maintenance/templates')
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
        <CardTitle>{templateId ? 'Edit Template' : 'New Template'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input id="name" {...register('name')} placeholder="Brake Inspection" />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of this maintenance service"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intervalMonths">Interval (Months)</Label>
              <Input
                id="intervalMonths"
                type="number"
                {...register('intervalMonths', { valueAsNumber: true })}
                placeholder="6"
              />
              {errors.intervalMonths && (
                <p className="text-sm text-red-600">{errors.intervalMonths.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervalMiles">Interval (Miles)</Label>
              <Input
                id="intervalMiles"
                type="number"
                {...register('intervalMiles', { valueAsNumber: true })}
                placeholder="10000"
              />
              {errors.intervalMiles && (
                <p className="text-sm text-red-600">{errors.intervalMiles.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Checklist Items</Label>
            <div className="flex gap-2">
              <Input
                value={checklistItem}
                onChange={(e) => setChecklistItem(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addChecklistItem()
                  }
                }}
                placeholder="Add checklist item..."
              />
              <Button type="button" onClick={addChecklistItem} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <ul className="space-y-2 mt-2">
                {checklistItems.map((item, index) => (
                  <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{item}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
          )}

          {!hasActiveSubscription && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              Active subscription required to create templates.{' '}
              <a href="/billing" className="underline font-medium">
                Manage subscription
              </a>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !hasActiveSubscription}>
              {loading ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
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


