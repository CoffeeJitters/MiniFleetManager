'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ReminderControls() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handleScan() {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/reminders/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      })

      const data = await res.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleProcess() {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/reminders/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' }),
      })

      const data = await res.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button onClick={handleScan} disabled={loading}>
          {loading ? 'Scanning...' : 'Scan for Reminders'}
        </Button>
        <Button onClick={handleProcess} disabled={loading} variant="outline">
          {loading ? 'Processing...' : 'Process Pending Reminders'}
        </Button>
      </div>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


