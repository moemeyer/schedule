-- Intelligent Routing System Database Schema
-- PostgreSQL with PostGIS extension for geospatial data

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Technicians table
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    skills JSONB NOT NULL DEFAULT '[]',
    home_location GEOGRAPHY(POINT, 4326) NOT NULL,
    home_address TEXT,
    available_hours JSONB NOT NULL DEFAULT '[]',
    max_jobs_per_day INTEGER DEFAULT 10,
    active BOOLEAN DEFAULT true,
    current_location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    license_plate VARCHAR(50) UNIQUE NOT NULL,
    capacity DECIMAL(10, 2),
    equipment_types JSONB NOT NULL DEFAULT '[]',
    fuel_efficiency DECIMAL(10, 2),
    max_range_km DECIMAL(10, 2),
    active BOOLEAN DEFAULT true,
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    current_location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    time_window_start TIMESTAMP,
    time_window_end TIMESTAMP,
    required_skills JSONB NOT NULL DEFAULT '[]',
    required_equipment JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    assigned_route_id UUID,
    scheduled_time TIMESTAMP,
    completed_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Routes table
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'draft',
    start_location GEOGRAPHY(POINT, 4326) NOT NULL,
    start_address TEXT,
    end_location GEOGRAPHY(POINT, 4326) NOT NULL,
    end_address TEXT,
    total_distance_km DECIMAL(10, 2) DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    optimization_score DECIMAL(5, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(technician_id, date)
);

-- Route stops table
CREATE TABLE route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    estimated_arrival_time TIMESTAMP NOT NULL,
    estimated_departure_time TIMESTAMP NOT NULL,
    actual_arrival_time TIMESTAMP,
    actual_departure_time TIMESTAMP,
    distance_from_previous_km DECIMAL(10, 2) DEFAULT 0,
    duration_from_previous_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(route_id, sequence_number),
    UNIQUE(route_id, job_id)
);

-- GPS tracking table
CREATE TABLE gps_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    speed DECIMAL(10, 2),
    heading DECIMAL(10, 2),
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Distance matrix cache table
CREATE TABLE distance_matrix_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_lat DECIMAL(10, 8) NOT NULL,
    origin_lng DECIMAL(11, 8) NOT NULL,
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,
    distance_km DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key for route_id in jobs table
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_routes
    FOREIGN KEY (assigned_route_id) REFERENCES routes(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_technicians_active ON technicians(active);
CREATE INDEX idx_technicians_location ON technicians USING GIST(current_location);
CREATE INDEX idx_vehicles_active ON vehicles(active);
CREATE INDEX idx_vehicles_assigned ON vehicles(assigned_technician_id);
CREATE INDEX idx_customers_location ON customers USING GIST(location);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs USING GIST(location);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_technician ON jobs(assigned_technician_id);
CREATE INDEX idx_jobs_route ON jobs(assigned_route_id);
CREATE INDEX idx_jobs_time_window ON jobs(time_window_start, time_window_end);
CREATE INDEX idx_routes_date ON routes(date);
CREATE INDEX idx_routes_technician ON routes(technician_id);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_route_stops_job ON route_stops(job_id);
CREATE INDEX idx_route_stops_sequence ON route_stops(route_id, sequence_number);
CREATE INDEX idx_gps_technician ON gps_updates(technician_id);
CREATE INDEX idx_gps_timestamp ON gps_updates(timestamp DESC);
CREATE INDEX idx_distance_cache_origin ON distance_matrix_cache(origin_lat, origin_lng);
CREATE INDEX idx_distance_cache_destination ON distance_matrix_cache(destination_lat, destination_lng);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables
CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON technicians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_route_stops_updated_at BEFORE UPDATE ON route_stops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
