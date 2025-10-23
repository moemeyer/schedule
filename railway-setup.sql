-- Railway Database Setup
-- Run this after first deployment to set up PostGIS and schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The schema.sql file will be run by the application
-- This file just ensures extensions are available
