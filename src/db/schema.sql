CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  skills TEXT[],
  skill_level VARCHAR(50),
  current_location GEOGRAPHY(POINT),
  status VARCHAR(50) DEFAULT 'available',
  vehicle_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(100) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  address TEXT,
  scheduled_date TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_technician_id UUID REFERENCES technicians(id),
  required_skills TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES technicians(id),
  date DATE NOT NULL,
  job_ids UUID[],
  total_distance FLOAT,
  total_duration INTEGER,
  optimized BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_technicians_location ON technicians USING GIST(current_location);
CREATE INDEX idx_jobs_location ON jobs USING GIST(location);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_routes_date ON routes(date);
