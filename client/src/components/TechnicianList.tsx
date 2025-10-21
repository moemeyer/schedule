import { useQuery } from '@tanstack/react-query'
import { Technician } from '../types'
import axios from 'axios'
import { User, MapPin, Award, Phone, Mail } from 'lucide-react'

export default function TechnicianList() {
  const { data: technicians, isLoading } = useQuery<Technician[]>({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await axios.get('/api/technicians')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading technicians...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-semibold text-gray-800">Technicians</h2>
        <p className="text-sm text-gray-600 mt-1">{technicians?.length || 0} total technicians</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {technicians?.map((technician) => (
          <div
            key={technician.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {technician.name.charAt(0)}
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">{technician.name}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      technician.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {technician.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {technician.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                {technician.phone}
              </div>
              {technician.currentLocation && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {technician.currentLocation.latitude.toFixed(4)}, {technician.currentLocation.longitude.toFixed(4)}
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="border-t pt-4">
              <div className="flex items-center mb-2">
                <Award className="w-4 h-4 mr-2 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Skills</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {technician.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      skill.certified
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {skill.serviceType} ({skill.level})
                    {skill.certified && ' ✓'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!technicians || technicians.length === 0) && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No technicians found</p>
        </div>
      )}
    </div>
  )
}
