# API Reference

Complete API documentation for the Intelligent Routing Service.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the API does not require authentication. In production, implement JWT or OAuth2.

## Jobs API

### List Jobs

Get a list of jobs with optional filters.

**Endpoint:** `GET /jobs`

**Query Parameters:**
- `status` (optional): Filter by job status (pending, scheduled, in_progress, completed, cancelled)
- `serviceType` (optional): Filter by service type
- `customerId` (optional): Filter by customer ID
- `assignedTechnicianId` (optional): Filter by assigned technician

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "customer-uuid",
    "serviceType": "general_pest",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "address": "123 Main St, San Francisco, CA"
    },
    "estimatedDurationMinutes": 60,
    "priority": 5,
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

### Create Job

Create a new service job.

**Endpoint:** `POST /jobs`

**Request Body:**
```json
{
  "customerId": "customer-uuid",
  "serviceType": "termite",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "123 Main St, San Francisco, CA"
  },
  "estimatedDurationMinutes": 90,
  "priority": 8,
  "timeWindow": {
    "start": "2024-01-15T09:00:00Z",
    "end": "2024-01-15T17:00:00Z"
  },
  "requiredSkills": [
    {
      "serviceType": "termite",
      "level": "senior",
      "certified": true
    }
  ],
  "requiredEquipment": ["drill", "chemicals"],
  "notes": "Customer prefers morning appointment",
  "status": "pending"
}
```

**Response:** `201 Created`

### Get Job

Get a single job by ID.

**Endpoint:** `GET /jobs/:id`

**Response:** `200 OK` or `404 Not Found`

### Update Job

Update a job's details.

**Endpoint:** `PATCH /jobs/:id`

**Request Body:**
```json
{
  "status": "completed",
  "completedTime": "2024-01-15T14:30:00Z"
}
```

**Response:** `200 OK`

### Delete Job

Delete a job.

**Endpoint:** `DELETE /jobs/:id`

**Response:** `204 No Content` or `404 Not Found`

## Technicians API

### List Technicians

Get a list of technicians.

**Endpoint:** `GET /technicians`

**Query Parameters:**
- `activeOnly` (optional): If "true", returns only active technicians

**Response:** `200 OK`
```json
[
  {
    "id": "tech-uuid",
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
    "currentLocation": {
      "latitude": 37.7849,
      "longitude": -122.4294
    },
    "maxJobsPerDay": 10,
    "active": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

### Create Technician

Create a new technician.

**Endpoint:** `POST /technicians`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-0456",
  "skills": [
    {
      "serviceType": "rodent",
      "level": "specialist",
      "certified": true
    },
    {
      "serviceType": "general_pest",
      "level": "senior",
      "certified": true
    }
  ],
  "homeLocation": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "200 Tech Ave, San Francisco, CA"
  },
  "availableHours": [
    {
      "start": "2024-01-15T08:00:00Z",
      "end": "2024-01-15T17:00:00Z"
    }
  ],
  "maxJobsPerDay": 12,
  "active": true
}
```

**Response:** `201 Created`

### Get Technician

Get a single technician by ID.

**Endpoint:** `GET /technicians/:id`

**Response:** `200 OK` or `404 Not Found`

### Update Technician

Update a technician's details.

**Endpoint:** `PATCH /technicians/:id`

**Request Body:**
```json
{
  "active": false,
  "phone": "555-9999"
}
```

**Response:** `200 OK`

### Update Technician Location

Update a technician's current GPS location.

**Endpoint:** `POST /technicians/:id/location`

**Request Body:**
```json
{
  "latitude": 37.7949,
  "longitude": -122.4394
}
```

**Response:** `200 OK`

### Delete Technician

Delete a technician.

**Endpoint:** `DELETE /technicians/:id`

**Response:** `204 No Content` or `404 Not Found`

## Routes API

### Optimize Routes

Optimize and create routes for a specific date.

**Endpoint:** `POST /routes/optimize`

**Request Body:**
```json
{
  "date": "2024-01-15",
  "jobIds": ["job-uuid-1", "job-uuid-2"],
  "technicianIds": ["tech-uuid-1"],
  "constraints": {
    "maxStopsPerRoute": 15,
    "maxRouteHours": 8,
    "maxTotalDistanceKm": 200,
    "requireSkillMatch": true,
    "requireEquipmentMatch": true,
    "minimizeDistance": true,
    "minimizeTime": true,
    "balanceWorkload": true
  }
}
```

**Response:** `200 OK`
```json
{
  "routes": [
    {
      "id": "route-uuid",
      "date": "2024-01-15",
      "technicianId": "tech-uuid-1",
      "vehicleId": "vehicle-uuid",
      "status": "planned",
      "stops": [
        {
          "jobId": "job-uuid-1",
          "sequenceNumber": 1,
          "estimatedArrivalTime": "2024-01-15T09:00:00Z",
          "estimatedDepartureTime": "2024-01-15T10:00:00Z",
          "distanceFromPreviousKm": 5.2,
          "durationFromPreviousMinutes": 15
        }
      ],
      "startLocation": {
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "endLocation": {
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "totalDistanceKm": 45.6,
      "totalDurationMinutes": 480,
      "optimizationScore": 87.5,
      "createdAt": "2024-01-15T08:00:00Z",
      "updatedAt": "2024-01-15T08:00:00Z"
    }
  ],
  "unassignedJobs": [],
  "metrics": {
    "totalScore": 87.5,
    "totalDistanceKm": 45.6,
    "totalDurationHours": 8.0,
    "computationTimeMs": 234
  }
}
```

### List Routes

Get a list of routes with optional filters.

**Endpoint:** `GET /routes`

**Query Parameters:**
- `technicianId` (optional): Filter by technician ID
- `date` (optional): Filter by date (YYYY-MM-DD)
- `status` (optional): Filter by route status

**Response:** `200 OK`

### Get Route

Get a single route by ID with all stops.

**Endpoint:** `GET /routes/:id`

**Response:** `200 OK` or `404 Not Found`

### Update Route

Update a route's details.

**Endpoint:** `PATCH /routes/:id`

**Request Body:**
```json
{
  "status": "in_progress",
  "notes": "Started route at 8:15 AM"
}
```

**Response:** `200 OK`

### Delete Route

Delete a route and unassign all jobs.

**Endpoint:** `DELETE /routes/:id`

**Response:** `204 No Content` or `404 Not Found`

## WebSocket API

### Connection

Connect to the WebSocket server for real-time GPS tracking.

**URL:** `ws://localhost:3000` or `http://localhost:3000`

### Events

#### technician:connect

Sent by technician to register their connection.

**Direction:** Client → Server

**Payload:**
```javascript
socket.emit('technician:connect', 'tech-uuid')
```

#### gps:update

Send GPS location update.

**Direction:** Client → Server

**Payload:**
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

#### gps:update (broadcast)

Receive GPS updates from any technician.

**Direction:** Server → All Clients

**Payload:**
```javascript
socket.on('gps:update', (data) => {
  console.log(data)
  // {
  //   technicianId: 'tech-uuid',
  //   location: { latitude: 37.7749, longitude: -122.4194 },
  //   speed: 45.5,
  //   heading: 90,
  //   timestamp: '2024-01-15T10:00:00Z'
  // }
})
```

#### gps:request

Request current location of a specific technician.

**Direction:** Client → Server

**Payload:**
```javascript
socket.emit('gps:request', 'tech-uuid')
```

#### gps:response

Receive current location response.

**Direction:** Server → Client

**Payload:**
```javascript
socket.on('gps:response', (data) => {
  console.log(data)
})
```

#### gps:all

Request all technician locations.

**Direction:** Client → Server

**Payload:**
```javascript
socket.emit('gps:all')
```

#### gps:all:response

Receive all technician locations.

**Direction:** Server → Client

**Payload:**
```javascript
socket.on('gps:all:response', (locations) => {
  console.log(locations)
  // [
  //   {
  //     technicianId: 'tech-uuid-1',
  //     name: 'John Doe',
  //     location: { latitude: 37.7749, longitude: -122.4194 }
  //   }
  // ]
})
```

#### technician:online / technician:offline

Technician connection status changes.

**Direction:** Server → All Clients

**Payload:**
```javascript
socket.on('technician:online', ({ technicianId }) => {
  console.log('Technician online:', technicianId)
})

socket.on('technician:offline', ({ technicianId }) => {
  console.log('Technician offline:', technicianId)
})
```

#### error

Error messages.

**Direction:** Server → Client

**Payload:**
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message)
})
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message (in development only)"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider:
- 100 requests per minute per IP for standard endpoints
- 1000 GPS updates per minute per technician
- Exponential backoff for repeated failures

## Pagination

For endpoints returning lists, pagination can be added:

```
GET /api/jobs?page=1&limit=50
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "pages": 5
  }
}
```

## Versioning

API versioning is recommended for production:

```
GET /api/v1/jobs
GET /api/v2/jobs
```

Current version: Unversioned (v1 implied)
