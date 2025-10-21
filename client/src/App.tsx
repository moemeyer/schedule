import { useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { MapPin, Users, Briefcase, TrendingUp } from 'lucide-react'
import MapView from './components/MapView'
import JobList from './components/JobList'
import TechnicianList from './components/TechnicianList'
import RouteOptimizer from './components/RouteOptimizer'

function App() {
  const [activeTab, setActiveTab] = useState('map')

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Intelligent Routing Dashboard
            </h1>
            <p className="text-sm text-gray-600">
              Home Service Routing & GPS Tracking
            </p>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b">
          <div className="px-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'map'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Live Map
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'jobs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Jobs
              </button>
              <button
                onClick={() => setActiveTab('technicians')}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'technicians'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Technicians
              </button>
              <button
                onClick={() => setActiveTab('optimize')}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'optimize'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Route Optimizer
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'map' && <MapView />}
            {activeTab === 'jobs' && <JobList />}
            {activeTab === 'technicians' && <TechnicianList />}
            {activeTab === 'optimize' && <RouteOptimizer />}
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App
