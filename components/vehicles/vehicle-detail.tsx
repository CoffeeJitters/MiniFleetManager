import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar } from 'lucide-react'

interface VehicleDetailProps {
  vehicle: any
  canEdit: boolean
}

export function VehicleDetail({ vehicle, canEdit }: VehicleDetailProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium">{vehicle.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Odometer:</span>
            <span className="font-medium">{vehicle.currentOdometer.toLocaleString()} miles</span>
          </div>
          {vehicle.inServiceDate && (
            <div className="flex justify-between">
              <span className="text-gray-600">In-Service Date:</span>
              <span className="font-medium">{format(new Date(vehicle.inServiceDate), 'MMM d, yyyy')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Services</CardTitle>
          <CardDescription>
            {vehicle.maintenanceSchedules.length} active schedule{vehicle.maintenanceSchedules.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vehicle.maintenanceSchedules.length === 0 ? (
            <p className="text-gray-600 text-sm">No maintenance schedules yet.</p>
          ) : (
            <div className="space-y-3">
              {vehicle.maintenanceSchedules.map((schedule: any) => {
                const isOverdue = schedule.nextDueDate && new Date(schedule.nextDueDate) < new Date()
                const daysUntil = schedule.nextDueDate
                  ? Math.ceil(
                      (new Date(schedule.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    )
                  : null

                return (
                  <div
                    key={schedule.id}
                    className={`p-3 border rounded-lg ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{schedule.template.name}</p>
                        {schedule.nextDueDate && (
                          <p className="text-sm text-gray-600">
                            Due: {format(new Date(schedule.nextDueDate), 'MMM d, yyyy')}
                            {daysUntil !== null && (
                              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                {' '}
                                ({isOverdue ? `${Math.abs(daysUntil)} days overdue` : `in ${daysUntil} days`})
                              </span>
                            )}
                          </p>
                        )}
                        {schedule.nextDueOdometer && (
                          <p className="text-sm text-gray-600">
                            Due at: {schedule.nextDueOdometer.toLocaleString()} miles
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <Link href={`/maintenance/log?vehicleId=${vehicle.id}&templateId=${schedule.templateId}`}>
                          <Button variant="outline" size="sm">Log Service</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent Service History</CardTitle>
          <CardDescription>Last 10 service records</CardDescription>
        </CardHeader>
        <CardContent>
          {vehicle.serviceEvents.length === 0 ? (
            <p className="text-gray-600 text-sm">No service history yet.</p>
          ) : (
            <div className="space-y-2">
              {vehicle.serviceEvents.map((event: any) => (
                <div key={event.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{event.template.name}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(event.performedAt), 'MMM d, yyyy')} •{' '}
                      {event.odometerAtService.toLocaleString()} miles
                    </p>
                    {event.notes && <p className="text-sm text-gray-600 mt-1">{event.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


