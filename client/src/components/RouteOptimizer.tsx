import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Job, Technician, Route } from '../types'
import axios from 'axios'
import { Zap, Calendar, Users, Briefcase, TrendingUp, AlertCircle } from 'lucide-react'

export default function RouteOptimizer() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([])
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: pendingJobs } = useQuery<Job[]>({
    queryKey: ['jobs', 'pending'],
    queryFn: async () => {
      const response = await axios.get('/api/jobs?status=pending')
      return response.data
    },
  })

  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ['technicians', 'active'],
    queryFn: async () => {
      const response = await axios.get('/api/technicians?activeOnly=true')
      return response.data
    },
  })

  const optimizeMutation = useMutation({
    mutationFn: async (data: {
      date: string
      jobIds?: string[]
      technicianIds?: string[]
      constraints?: any
    }) => {
      const response = await axios.post('/api/routes/optimize', data)
      return response.data
    },
    onSuccess: (data) => {
      setOptimizationResult(data)
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })

  const handleOptimize = () => {
    optimizeMutation.mutate({
      date: selectedDate,
      jobIds: selectedJobs.length > 0 ? selectedJobs : undefined,
      technicianIds: selectedTechnicians.length > 0 ? selectedTechnicians : undefined,
      constraints: {
        maxStopsPerRoute: 25,
        maxRouteHours: 10,
        requireSkillMatch: true,
        requireEquipmentMatch: true,
        minimizeDistance: true,
      },
    })
  }

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    )
  }

  const toggleTechnicianSelection = (techId: string) => {
    setSelectedTechnicians(prev =>
      prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <Zap className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-2xl font-semibold text-gray-800">Route Optimizer</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Job Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Jobs Selected
            </label>
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-semibold">
              {selectedJobs.length > 0 ? selectedJobs.length : 'All'} / {pendingJobs?.length || 0}
            </div>
          </div>

          {/* Technician Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Technicians Selected
            </label>
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-semibold">
              {selectedTechnicians.length > 0 ? selectedTechnicians.length : 'All'} / {technicians?.length || 0}
            </div>
          </div>
        </div>

        {/* Optimize Button */}
        <button
          onClick={handleOptimize}
          disabled={optimizeMutation.isPending || !pendingJobs || pendingJobs.length === 0}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
            optimizeMutation.isPending || !pendingJobs || pendingJobs.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {optimizeMutation.isPending ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Optimizing Routes...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Optimize Routes
            </span>
          )}
        </button>
      </div>

      {/* Job Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Jobs (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pendingJobs?.map((job) => (
            <div
              key={job.id}
              onClick={() => toggleJobSelection(job.id)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedJobs.includes(job.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{job.serviceType}</p>
                  <p className="text-xs text-gray-500">{job.estimatedDurationMinutes} min • Priority: {job.priority}</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedJobs.includes(job.id)}
                  onChange={() => {}}
                  className="h-4 w-4 text-blue-600"
                />
              </div>
            </div>
          ))}
        </div>
        {(!pendingJobs || pendingJobs.length === 0) && (
          <p className="text-center text-gray-500 py-8">No pending jobs available</p>
        )}
      </div>

      {/* Technician Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Technicians (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {technicians?.map((tech) => (
            <div
              key={tech.id}
              onClick={() => toggleTechnicianSelection(tech.id)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedTechnicians.includes(tech.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{tech.name}</p>
                  <p className="text-xs text-gray-500">{tech.skills.length} skills</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedTechnicians.includes(tech.id)}
                  onChange={() => {}}
                  className="h-4 w-4 text-blue-600"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimization Results */}
      {optimizationResult && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Optimization Results</h3>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Routes Created</p>
              <p className="text-2xl font-bold text-blue-600">{optimizationResult.routes?.length || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Distance</p>
              <p className="text-2xl font-bold text-green-600">
                {optimizationResult.metrics?.totalDistanceKm.toFixed(1)} km
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-2xl font-bold text-orange-600">
                {optimizationResult.metrics?.totalDurationHours.toFixed(1)} hrs
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Optimization Score</p>
              <p className="text-2xl font-bold text-purple-600">
                {optimizationResult.metrics?.totalScore.toFixed(0)}/100
              </p>
            </div>
          </div>

          {/* Unassigned Jobs Warning */}
          {optimizationResult.unassignedJobs && optimizationResult.unassignedJobs.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800">
                    {optimizationResult.unassignedJobs.length} Unassigned Jobs
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Some jobs could not be assigned due to skill/equipment constraints or capacity limits.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Routes List */}
          <div className="space-y-4">
            {optimizationResult.routes?.map((route: Route, idx: number) => (
              <div key={route.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">
                    Route #{idx + 1} - {route.technician?.name || route.technicianId}
                  </h4>
                  <span className="text-sm text-gray-600">
                    {route.stops.length} stops • {route.totalDistanceKm.toFixed(1)} km • {(route.totalDurationMinutes / 60).toFixed(1)} hrs
                  </span>
                </div>
                <div className="space-y-2">
                  {route.stops.map((stop, stopIdx) => (
                    <div key={stopIdx} className="flex items-center text-sm">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mr-3">
                        {stopIdx + 1}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{stop.job?.serviceType}</span>
                        <span className="text-gray-500 mx-2">•</span>
                        <span className="text-gray-600">{stop.job?.estimatedDurationMinutes} min</span>
                      </div>
                      <span className="text-gray-500 text-xs">
                        {new Date(stop.estimatedArrivalTime).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {optimizeMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Optimization Failed</p>
              <p className="text-sm text-red-700 mt-1">
                An error occurred while optimizing routes. Please try again.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
