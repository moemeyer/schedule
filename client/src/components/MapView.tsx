import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { Icon } from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import { io, Socket } from 'socket.io-client'
import { Technician, Route, GPSUpdate } from '../types'
import axios from 'axios'

const technicianIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const jobIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function MapView() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [technicianLocations, setTechnicianLocations] = useState<Map<string, GPSUpdate>>(new Map())

  // Fetch technicians
  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await axios.get('/api/technicians?activeOnly=true')
      return response.data
    },
    refetchInterval: 30000,
  })

  // Fetch active routes
  const { data: routes } = useQuery<Route[]>({
    queryKey: ['routes', 'in_progress'],
    queryFn: async () => {
      const response = await axios.get('/api/routes?status=in_progress')
      return response.data
    },
    refetchInterval: 30000,
  })

  // Setup WebSocket connection for real-time GPS updates
  useEffect(() => {
    const newSocket = io('http://localhost:3000')

    newSocket.on('connect', () => {
      console.log('Connected to GPS tracking server')
      newSocket.emit('gps:all')
    })

    newSocket.on('gps:update', (update: GPSUpdate) => {
      setTechnicianLocations(prev => {
        const newMap = new Map(prev)
        newMap.set(update.technicianId, update)
        return newMap
      })
    })

    newSocket.on('gps:all:response', (locations: Array<{technicianId: string, location: {latitude: number, longitude: number}}>) => {
      const newMap = new Map<string, GPSUpdate>()
      locations.forEach(loc => {
        newMap.set(loc.technicianId, {
          technicianId: loc.technicianId,
          location: loc.location,
          timestamp: new Date(),
        })
      })
      setTechnicianLocations(newMap)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Default center (can be adjusted)
  const center: [number, number] = [37.7749, -122.4194] // San Francisco

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Live GPS Tracking</h2>
        <p className="text-sm text-gray-600 mt-1">
          {technicians?.length || 0} active technicians • {routes?.length || 0} routes in progress
        </p>
      </div>

      <div style={{ height: '600px' }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render technician markers */}
          {technicians?.map(technician => {
            const gpsUpdate = technicianLocations.get(technician.id)
            const location = gpsUpdate?.location || technician.currentLocation

            if (!location) return null

            return (
              <Marker
                key={technician.id}
                position={[location.latitude, location.longitude]}
                icon={technicianIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">{technician.name}</h3>
                    <p className="text-sm text-gray-600">{technician.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {gpsUpdate?.timestamp ? new Date(gpsUpdate.timestamp).toLocaleTimeString() : 'N/A'}
                    </p>
                    {gpsUpdate?.speed && (
                      <p className="text-xs text-gray-500">
                        Speed: {gpsUpdate.speed.toFixed(1)} km/h
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Render route polylines */}
          {routes?.map(route => {
            const positions: [number, number][] = []

            // Add start location
            positions.push([route.stops[0]?.job?.location.latitude || 0, route.stops[0]?.job?.location.longitude || 0])

            // Add all stop locations
            route.stops.forEach(stop => {
              if (stop.job?.location) {
                positions.push([stop.job.location.latitude, stop.job.location.longitude])
              }
            })

            return (
              <Polyline
                key={route.id}
                positions={positions}
                color="blue"
                weight={3}
                opacity={0.7}
              />
            )
          })}

          {/* Render job markers for active routes */}
          {routes?.flatMap(route =>
            route.stops.map(stop => {
              if (!stop.job?.location) return null

              return (
                <Marker
                  key={stop.jobId}
                  position={[stop.job.location.latitude, stop.job.location.longitude]}
                  icon={jobIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">Job #{stop.sequenceNumber}</h3>
                      <p className="text-sm text-gray-600">{stop.job.serviceType}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        ETA: {new Date(stop.estimatedArrivalTime).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Duration: {stop.job.estimatedDurationMinutes} min
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )
            })
          )}
        </MapContainer>
      </div>

      {/* Stats panel */}
      <div className="p-4 bg-gray-50 border-t grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{technicians?.length || 0}</p>
          <p className="text-xs text-gray-600">Active Technicians</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{routes?.length || 0}</p>
          <p className="text-xs text-gray-600">Routes in Progress</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">
            {routes?.reduce((sum, r) => sum + r.stops.length, 0) || 0}
          </p>
          <p className="text-xs text-gray-600">Active Jobs</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {routes?.reduce((sum, r) => sum + r.totalDistanceKm, 0).toFixed(1) || 0} km
          </p>
          <p className="text-xs text-gray-600">Total Distance</p>
        </div>
      </div>
    </div>
  )
}
