-- ==========================================================
-- Pulse Dial: Geofenced Rapid Emergency Blood Dispatch System
-- Database Schema: PostgreSQL 16 with PostGIS Extension
-- ==========================================================

-- Spatial & Utility Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hospitals Entity
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donors Entity
CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    blood_type VARCHAR(5) NOT NULL,
    last_known_location GEOGRAPHY(Point, 4326),
    last_location_updated TIMESTAMP WITH TIME ZONE,
    last_donation_date DATE,
    reliability_score INT DEFAULT 100,
    is_available BOOLEAN DEFAULT TRUE,
    fcm_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Dispatch Request Entity
DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('NORMAL', 'URGENT', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('DISPATCHING', 'FULFILLED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    blood_type VARCHAR(5) NOT NULL,
    units_needed INT NOT NULL DEFAULT 1,
    urgency urgency_level DEFAULT 'URGENT',
    current_radius_km INT DEFAULT 1,
    status request_status DEFAULT 'DISPATCHING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Individual Dispatch Assignments
DO $$ BEGIN
    CREATE TYPE response_status AS ENUM ('PINGED', 'ACCEPTED', 'DECLINED', 'ARRIVED', 'COMPLETED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS dispatch_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES emergency_requests(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES donors(id) ON DELETE CASCADE,
    tier_level INT NOT NULL,
    status response_status DEFAULT 'PINGED',
    distance_meters FLOAT,
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_request_donor UNIQUE(request_id, donor_id)
);

-- Spatial & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_hospital_location ON hospitals USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_donor_location ON donors USING GIST(last_known_location);
CREATE INDEX IF NOT EXISTS idx_donor_lookup ON donors(blood_type, is_available, last_donation_date);
