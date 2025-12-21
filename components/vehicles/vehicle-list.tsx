'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { VehicleStatus } from '@prisma/client'

interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  vin: string | null
  licensePlate: string | null
  currentOdometer: number
  status: VehicleStatus
  _count: {
    maintenanceSchedules: number
    serviceEvents: number
  }
}

export function VehicleList({ vehicles }: { vehicles: Vehicle[] }) {
  const [search, setSearch] = useState('')

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles
    
    const searchLower = search.toLowerCase()
    return vehicles.filter((v) => {
      return (
        v.make.toLowerCase().includes(searchLower) ||
        v.model.toLowerCase().includes(searchLower) ||
        v.vin?.toLowerCase().includes(searchLower) ||
        v.licensePlate?.toLowerCase().includes(searchLower)
      )
    })
  }, [vehicles, search])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVehicles.map((vehicle) => (
          <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {vehicle.licensePlate && (
                    <p className="text-sm text-gray-600">Plate: {vehicle.licensePlate}</p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    vehicle.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : vehicle.status === 'MAINTENANCE'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {vehicle.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>Odometer: {vehicle.currentOdometer.toLocaleString()} miles</p>
                <p>Schedules: {vehicle._count.maintenanceSchedules}</p>
                <p>Service History: {vehicle._count.serviceEvents} records</p>
              </div>
              <Link href={`/vehicles/${vehicle.id}`}>
                <Button variant="outline" className="w-full">View Details</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No vehicles match your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


