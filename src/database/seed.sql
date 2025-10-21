-- Sample data for testing and demonstration
-- Run this after creating the schema

-- Insert sample customers
INSERT INTO customers (id, name, email, phone, location, address) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Acme Corporation', 'contact@acme.com', '555-0101', ST_GeogFromText('POINT(-122.4194 37.7749)'), '123 Market St, San Francisco, CA 94103'),
  ('c2222222-2222-2222-2222-222222222222', 'Tech Startup Inc', 'info@techstartup.com', '555-0102', ST_GeogFromText('POINT(-122.4084 37.7849)'), '456 Mission St, San Francisco, CA 94105'),
  ('c3333333-3333-3333-3333-333333333333', 'Restaurant Group', 'manager@restaurant.com', '555-0103', ST_GeogFromText('POINT(-122.4284 37.7649)'), '789 Howard St, San Francisco, CA 94103'),
  ('c4444444-4444-4444-4444-444444444444', 'Retail Store', 'ops@retail.com', '555-0104', ST_GeogFromText('POINT(-122.3984 37.7949)'), '321 Folsom St, San Francisco, CA 94107'),
  ('c5555555-5555-5555-5555-555555555555', 'Office Building', 'facility@office.com', '555-0105', ST_GeogFromText('POINT(-122.4384 37.7549)'), '654 Harrison St, San Francisco, CA 94107');

-- Insert sample technicians
INSERT INTO technicians (id, name, email, phone, skills, home_location, home_address, available_hours, max_jobs_per_day, active) VALUES
  (
    't1111111-1111-1111-1111-111111111111',
    'John Smith',
    'john.smith@pestcontrol.com',
    '555-1001',
    '[
      {"serviceType": "general_pest", "level": "senior", "certified": true},
      {"serviceType": "rodent", "level": "senior", "certified": true},
      {"serviceType": "inspection", "level": "specialist", "certified": true}
    ]'::jsonb,
    ST_GeogFromText('POINT(-122.4194 37.7749)'),
    '100 Tech Lane, San Francisco, CA',
    '[{"start": "2024-01-15T08:00:00Z", "end": "2024-01-15T18:00:00Z"}]'::jsonb,
    12,
    true
  ),
  (
    't2222222-2222-2222-2222-222222222222',
    'Maria Garcia',
    'maria.garcia@pestcontrol.com',
    '555-1002',
    '[
      {"serviceType": "termite", "level": "specialist", "certified": true},
      {"serviceType": "general_pest", "level": "senior", "certified": true},
      {"serviceType": "bed_bug", "level": "senior", "certified": true}
    ]'::jsonb,
    ST_GeogFromText('POINT(-122.4084 37.7849)'),
    '200 Service Ave, San Francisco, CA',
    '[{"start": "2024-01-15T08:00:00Z", "end": "2024-01-15T18:00:00Z"}]'::jsonb,
    10,
    true
  ),
  (
    't3333333-3333-3333-3333-333333333333',
    'David Chen',
    'david.chen@pestcontrol.com',
    '555-1003',
    '[
      {"serviceType": "mosquito", "level": "senior", "certified": true},
      {"serviceType": "wildlife", "level": "junior", "certified": false},
      {"serviceType": "general_pest", "level": "junior", "certified": true}
    ]'::jsonb,
    ST_GeogFromText('POINT(-122.4284 37.7649)'),
    '300 Route Blvd, San Francisco, CA',
    '[{"start": "2024-01-15T08:00:00Z", "end": "2024-01-15T18:00:00Z"}]'::jsonb,
    10,
    true
  );

-- Insert sample vehicles
INSERT INTO vehicles (id, name, type, license_plate, capacity, equipment_types, fuel_efficiency, max_range_km, active, assigned_technician_id) VALUES
  (
    'v1111111-1111-1111-1111-111111111111',
    'Service Van 1',
    'van',
    'ABC-123',
    1500,
    '["general_pest", "rodent", "inspection", "mosquito"]'::jsonb,
    12.5,
    400,
    true,
    't1111111-1111-1111-1111-111111111111'
  ),
  (
    'v2222222-2222-2222-2222-222222222222',
    'Service Van 2',
    'van',
    'DEF-456',
    1500,
    '["termite", "general_pest", "bed_bug", "inspection"]'::jsonb,
    12.0,
    400,
    true,
    't2222222-2222-2222-2222-222222222222'
  ),
  (
    'v3333333-3333-3333-3333-333333333333',
    'Service Truck 1',
    'truck',
    'GHI-789',
    2000,
    '["mosquito", "wildlife", "general_pest"]'::jsonb,
    10.0,
    500,
    true,
    't3333333-3333-3333-3333-333333333333'
  );

-- Insert sample pending jobs
INSERT INTO jobs (id, customer_id, service_type, location, address, estimated_duration_minutes, priority, required_skills, required_equipment, notes, status) VALUES
  (
    'j1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'general_pest',
    ST_GeogFromText('POINT(-122.4194 37.7749)'),
    '123 Market St, San Francisco, CA',
    60,
    7,
    '[{"serviceType": "general_pest", "level": "junior", "certified": true}]'::jsonb,
    '["sprayer", "chemicals"]'::jsonb,
    'Monthly maintenance service',
    'pending'
  ),
  (
    'j2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222',
    'rodent',
    ST_GeogFromText('POINT(-122.4084 37.7849)'),
    '456 Mission St, San Francisco, CA',
    90,
    9,
    '[{"serviceType": "rodent", "level": "senior", "certified": true}]'::jsonb,
    '["traps", "bait"]'::jsonb,
    'Emergency rodent infestation',
    'pending'
  ),
  (
    'j3333333-3333-3333-3333-333333333333',
    'c3333333-3333-3333-3333-333333333333',
    'general_pest',
    ST_GeogFromText('POINT(-122.4284 37.7649)'),
    '789 Howard St, San Francisco, CA',
    45,
    5,
    '[{"serviceType": "general_pest", "level": "junior", "certified": true}]'::jsonb,
    '["sprayer"]'::jsonb,
    'Restaurant kitchen treatment',
    'pending'
  ),
  (
    'j4444444-4444-4444-4444-444444444444',
    'c4444444-4444-4444-4444-444444444444',
    'termite',
    ST_GeogFromText('POINT(-122.3984 37.7949)'),
    '321 Folsom St, San Francisco, CA',
    120,
    8,
    '[{"serviceType": "termite", "level": "specialist", "certified": true}]'::jsonb,
    '["drill", "chemicals", "moisture_meter"]'::jsonb,
    'Termite inspection and treatment',
    'pending'
  ),
  (
    'j5555555-5555-5555-5555-555555555555',
    'c5555555-5555-5555-5555-555555555555',
    'bed_bug',
    ST_GeogFromText('POINT(-122.4384 37.7549)'),
    '654 Harrison St, San Francisco, CA',
    90,
    10,
    '[{"serviceType": "bed_bug", "level": "senior", "certified": true}]'::jsonb,
    '["steamer", "chemicals", "vacuum"]'::jsonb,
    'Urgent bed bug treatment',
    'pending'
  ),
  (
    'j6666666-6666-6666-6666-666666666666',
    'c1111111-1111-1111-1111-111111111111',
    'inspection',
    ST_GeogFromText('POINT(-122.4194 37.7749)'),
    '123 Market St, San Francisco, CA',
    30,
    3,
    '[{"serviceType": "inspection", "level": "junior", "certified": true}]'::jsonb,
    '["flashlight", "checklist"]'::jsonb,
    'Quarterly inspection',
    'pending'
  ),
  (
    'j7777777-7777-7777-7777-777777777777',
    'c2222222-2222-2222-2222-222222222222',
    'mosquito',
    ST_GeogFromText('POINT(-122.4084 37.7849)'),
    '456 Mission St, San Francisco, CA',
    60,
    6,
    '[{"serviceType": "mosquito", "level": "junior", "certified": true}]'::jsonb,
    '["fogger", "larvicide"]'::jsonb,
    'Outdoor mosquito treatment',
    'pending'
  ),
  (
    'j8888888-8888-8888-8888-888888888888',
    'c3333333-3333-3333-3333-333333333333',
    'follow_up',
    ST_GeogFromText('POINT(-122.4284 37.7649)'),
    '789 Howard St, San Francisco, CA',
    30,
    4,
    '[{"serviceType": "general_pest", "level": "trainee", "certified": false}]'::jsonb,
    '[]'::jsonb,
    'Follow-up inspection from last week',
    'pending'
  );

-- Insert some sample distance matrix cache entries (for testing)
INSERT INTO distance_matrix_cache (origin_lat, origin_lng, destination_lat, destination_lng, distance_km, duration_minutes) VALUES
  (37.7749, -122.4194, 37.7849, -122.4084, 2.1, 8),
  (37.7849, -122.4084, 37.7649, -122.4284, 3.5, 12),
  (37.7649, -122.4284, 37.7949, -122.3984, 4.2, 15),
  (37.7949, -122.3984, 37.7549, -122.4384, 5.8, 20);

-- Print summary
SELECT 'Database seeded successfully!' AS status;
SELECT COUNT(*) AS customer_count FROM customers;
SELECT COUNT(*) AS technician_count FROM technicians;
SELECT COUNT(*) AS vehicle_count FROM vehicles;
SELECT COUNT(*) AS job_count FROM jobs;
