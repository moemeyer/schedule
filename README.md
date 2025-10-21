# Intelligent Routing Service for Home Service Providers

A comprehensive routing and scheduling application designed for home service providers (pest control, HVAC, plumbing, etc.) with GPS tracking, multi-route optimization, and intelligent assignment logic.

## Features

### Core Functionality
- **Multi-Route Optimization**: Optimizes routes for multiple technicians simultaneously
- **Intelligent Job Assignment**: Considers skills, vehicle equipment, service types, and time windows
- **Real-Time GPS Tracking**: WebSocket-based live location tracking for all technicians
- **Interactive Dashboard**: React-based dashboard with map visualization
- **Distance Matrix Caching**: Reduces API calls and improves performance
- **Constraint-Based Optimization**: Respects technician skills, vehicle capacity, and service requirements

### Route Optimization Features
- **Multiple Algorithm Support**:
  - Nearest Neighbor for initial route construction
  - 2-Opt improvement for route refinement
  - Constraint satisfaction for skills and equipment matching
- **Optimization Criteria**:
  - Minimize total distance
  - Minimize total time
  - Balance workload across technicians
  - Respect time windows
  - Match required skills and equipment

### GPS & Mapping
- Real-time technician location tracking
- Google Maps API integration (with Haversine fallback)
- Route visualization on interactive maps
- GPS history tracking and playback

## Technology Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** for REST API
- **Socket.io** for real-time GPS tracking
- **PostgreSQL** with **PostGIS** for geospatial data
- **Google Maps API** for distance/duration calculations

### Frontend
- **React** with **TypeScript**
- **Vite** for build tooling
- **React Leaflet** for map visualization
- **TailwindCSS** for styling
- **TanStack Query** for data fetching
- **Zustand** for state management

## Project Structure

```
schedule/
├── src/                          # Backend source code
│   ├── server.ts                # Main server entry point
│   ├── types/                   # TypeScript type definitions
│   ├── database/                # Database connection and schema
│   ├── repositories/            # Data access layer
│   ├── services/                # Business logic
│   │   ├── distanceService.ts  # Distance calculation & caching
│   │   ├── routeOptimizer.ts   # Route optimization engine
│   │   └── gpsTrackingService.ts # Real-time GPS tracking
│   ├── controllers/             # API controllers
│   └── routes/                  # API routes
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── MapView.tsx    # Live GPS map
│   │   │   ├── JobList.tsx    # Job management
│   │   │   ├── TechnicianList.tsx # Technician management
│   │   │   └── RouteOptimizer.tsx # Route optimization UI
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   └── package.json
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ with PostGIS extension
- Google Maps API key (optional, will fall back to Haversine)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd schedule

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb routing_db

# Enable PostGIS extension
psql routing_db -c "CREATE EXTENSION postgis;"

# Run schema migration
psql routing_db < src/database/schema.sql
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=routing_db
DB_USER=postgres
DB_PASSWORD=your_password

# Google Maps API (optional)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Routing Configuration
MAX_ROUTES_PER_DAY=50
MAX_STOPS_PER_ROUTE=25
DEFAULT_SERVICE_DURATION_MINUTES=60
ROUTE_START_TIME=08:00
ROUTE_END_TIME=18:00

# GPS Tracking
GPS_UPDATE_INTERVAL_MS=30000
```

### 4. Start the Application

```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend development server
cd client
npm run dev
```

The backend API will be available at `http://localhost:3000`
The frontend dashboard will be available at `http://localhost:3001`

## API Documentation

### Jobs

#### Create a Job
```http
POST /api/jobs
Content-Type: application/json

{
  "customerId": "customer-uuid",
  "serviceType": "general_pest",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "123 Main St, San Francisco, CA"
  },
  "estimatedDurationMinutes": 60,
  "priority": 5,
  "requiredSkills": [
    {
      "serviceType": "general_pest",
      "level": "junior",
      "certified": true
    }
  ],
  "requiredEquipment": ["sprayer", "chemicals"],
  "status": "pending"
}
```

#### Get Jobs
```http
GET /api/jobs?status=pending&serviceType=general_pest
```

#### Update Job Status
```http
PATCH /api/jobs/:id
Content-Type: application/json

{
  "status": "completed"
}
```

### Technicians

#### Create a Technician
```http
POST /api/technicians
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-0123",
  "skills": [
    {
      "serviceType": "general_pest",
      "level": "senior",
      "certified": true
    }
  ],
  "homeLocation": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "100 Home St, San Francisco, CA"
  },
  "maxJobsPerDay": 10,
  "active": true
}
```

#### Get Technicians
```http
GET /api/technicians?activeOnly=true
```

#### Update Technician Location
```http
POST /api/technicians/:id/location
Content-Type: application/json

{
  "latitude": 37.7849,
  "longitude": -122.4294
}
```

### Routes

#### Optimize Routes
```http
POST /api/routes/optimize
Content-Type: application/json

{
  "date": "2024-01-15",
  "jobIds": ["job-uuid-1", "job-uuid-2"],
  "technicianIds": ["tech-uuid-1", "tech-uuid-2"],
  "constraints": {
    "maxStopsPerRoute": 25,
    "maxRouteHours": 10,
    "maxTotalDistanceKm": 300,
    "requireSkillMatch": true,
    "requireEquipmentMatch": true,
    "minimizeDistance": true,
    "minimizeTime": true,
    "balanceWorkload": true
  }
}
```

Response:
```json
{
  "routes": [
    {
      "id": "route-uuid",
      "date": "2024-01-15",
      "technicianId": "tech-uuid-1",
      "stops": [...],
      "totalDistanceKm": 45.6,
      "totalDurationMinutes": 420,
      "optimizationScore": 87.5
    }
  ],
  "unassignedJobs": [],
  "metrics": {
    "totalScore": 87.5,
    "totalDistanceKm": 45.6,
    "totalDurationHours": 7.0,
    "computationTimeMs": 234
  }
}
```

#### Get Routes
```http
GET /api/routes?technicianId=tech-uuid&date=2024-01-15&status=in_progress
```

## WebSocket Events (GPS Tracking)

### Client Events (Technician App)

#### Connect as Technician
```javascript
socket.emit('technician:connect', technicianId)
```

#### Send GPS Update
```javascript
socket.emit('gps:update', {
  technicianId: 'tech-uuid',
  location: {
    latitude: 37.7749,
    longitude: -122.4194
  },
  speed: 45.5,
  heading: 90,
  timestamp: new Date()
})
```

### Server Events (Dashboard)

#### Receive GPS Update
```javascript
socket.on('gps:update', (data) => {
  console.log('GPS update:', data)
  // Update map marker
})
```

#### Technician Online/Offline
```javascript
socket.on('technician:online', ({ technicianId }) => {
  console.log('Technician online:', technicianId)
})

socket.on('technician:offline', ({ technicianId }) => {
  console.log('Technician offline:', technicianId)
})
```

#### Request All Technician Locations
```javascript
socket.emit('gps:all')

socket.on('gps:all:response', (locations) => {
  console.log('All technician locations:', locations)
})
```

## Route Optimization Algorithm

### Overview
The system uses a multi-stage optimization approach:

1. **Job Assignment Phase**
   - Filters jobs by skill and equipment requirements
   - Assigns jobs to qualified technicians
   - Balances workload across available technicians

2. **Initial Route Construction**
   - Uses Nearest Neighbor algorithm
   - Starts from technician's home location
   - Builds initial route based on proximity

3. **Route Improvement**
   - Applies 2-Opt algorithm for refinement
   - Reduces total distance and time
   - Respects time windows and constraints

4. **Scoring and Validation**
   - Calculates optimization score (0-100)
   - Validates against constraints
   - Generates warnings for violations

### Constraints Supported
- **Skill Matching**: Ensures technician has required skill level
- **Equipment Matching**: Checks vehicle has necessary equipment
- **Time Windows**: Respects job time window requirements
- **Route Duration**: Limits total hours per route
- **Route Distance**: Limits total kilometers per route
- **Stops Per Route**: Maximum number of stops allowed
- **Workload Balance**: Distributes jobs evenly

## Usage Examples

### Example 1: Create and Optimize Daily Routes

```bash
# 1. Create some pending jobs
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-1",
    "serviceType": "general_pest",
    "location": {"latitude": 37.7749, "longitude": -122.4194},
    "estimatedDurationMinutes": 60,
    "priority": 5,
    "status": "pending"
  }'

# 2. Optimize routes for today
curl -X POST http://localhost:3000/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "constraints": {
      "maxStopsPerRoute": 10,
      "requireSkillMatch": true
    }
  }'

# 3. View optimized routes
curl http://localhost:3000/api/routes?date=2024-01-15
```

### Example 2: Real-Time GPS Tracking

```javascript
// Technician mobile app
import io from 'socket.io-client'

const socket = io('http://localhost:3000')
const technicianId = 'tech-uuid'

// Connect
socket.emit('technician:connect', technicianId)

// Send GPS updates every 30 seconds
setInterval(() => {
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit('gps:update', {
      technicianId,
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: new Date(),
    })
  })
}, 30000)
```

## Performance Optimization

### Distance Matrix Caching
- Caches distance calculations in PostgreSQL
- Reduces Google Maps API calls by ~90%
- 24-hour cache duration (configurable)
- Haversine distance as fallback

### Database Indexes
- Geospatial indexes on all location columns
- Composite indexes for common queries
- Optimized for route lookup and GPS queries

### API Rate Limiting
- Batches distance calculations
- Implements exponential backoff
- Falls back to Haversine for failures

## Deployment

### Production Build

```bash
# Build backend
npm run build

# Build frontend
cd client
npm run build
cd ..

# Start production server
NODE_ENV=production npm start
```

### Docker Deployment (Optional)

```dockerfile
# Coming soon
```

## Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Email: support@example.com

## Roadmap

- [ ] Mobile app for technicians (React Native)
- [ ] Advanced algorithms (Genetic Algorithm, Simulated Annealing)
- [ ] Traffic-aware routing using real-time data
- [ ] Customer portal for job tracking
- [ ] Analytics and reporting dashboard
- [ ] Multi-depot support
- [ ] Break time scheduling
- [ ] Recurring job templates
- [ ] SMS/Email notifications
- [ ] Integration with popular CRM systems

## Credits

Built with:
- Route4Me and NextBillion.ai as inspiration
- Google Maps API for distance calculations
- OpenStreetMap for map tiles
- PostgreSQL/PostGIS for geospatial data
