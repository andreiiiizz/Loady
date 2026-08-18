-- ==============================================================================
-- LoadWise Supabase Database Schema
-- Philippine Prepaid Burn-Rate & Crowd-Sourced Coverage Database
-- ==============================================================================

-- 1. Enable PostGIS for geospatial queries & barangay coordinates
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Coverage Reports Table
CREATE TABLE IF NOT EXISTS public.coverage_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telco VARCHAR(20) NOT NULL CHECK (telco IN ('Globe', 'Smart', 'DITO', 'TM', 'TNT', 'GOMO')),
    barangay VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    province VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    signal_rating SMALLINT NOT NULL CHECK (signal_rating BETWEEN 1 AND 5),
    network_type VARCHAR(20) NOT NULL CHECK (network_type IN ('5G', '4G/LTE', '3G', '2G', 'Deadzone')),
    speed_mbps NUMERIC(6, 2),
    notes TEXT,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_name VARCHAR(100) DEFAULT 'Anonymous Scout',
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for high-speed geospatial bounding box and radius queries
CREATE INDEX IF NOT EXISTS idx_coverage_reports_geom ON public.coverage_reports USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_coverage_reports_telco ON public.coverage_reports(telco);
CREATE INDEX IF NOT EXISTS idx_coverage_reports_created_at ON public.coverage_reports(created_at DESC);

-- 3. Promos Table
CREATE TABLE IF NOT EXISTS public.promos (
    id VARCHAR(100) PRIMARY KEY,
    telco VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    price_php NUMERIC(8, 2) NOT NULL,
    data_allowance_mb INTEGER NOT NULL,
    validity_days INTEGER NOT NULL,
    is_no_expiry BOOLEAN DEFAULT FALSE,
    freebie_details TEXT,
    ussd_code VARCHAR(50),
    sms_keyword VARCHAR(50),
    sms_send_to VARCHAR(20),
    category VARCHAR(50) DEFAULT 'popular',
    highlights TEXT[],
    cost_per_gb NUMERIC(8, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User SIM Profiles Table
CREATE TABLE IF NOT EXISTS public.user_sims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    telco VARCHAR(20) NOT NULL,
    phone_number VARCHAR(30),
    active_promo VARCHAR(150),
    total_data_mb NUMERIC(10, 2) NOT NULL,
    remaining_data_mb NUMERIC(10, 2) NOT NULL,
    expiry_date TIMESTAMPTZ,
    is_no_expiry BOOLEAN DEFAULT FALSE,
    auto_tracking_enabled BOOLEAN DEFAULT TRUE,
    usage_profile VARCHAR(30) DEFAULT 'moderate',
    regular_balance_php NUMERIC(8, 2) DEFAULT 0.0,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.coverage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sims ENABLE ROW LEVEL SECURITY;

-- Public can read all coverage reports and promos
CREATE POLICY "Public can read coverage reports" ON public.coverage_reports FOR SELECT USING (true);
CREATE POLICY "Public can insert coverage reports" ON public.coverage_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read promos" ON public.promos FOR SELECT USING (true);

-- Authenticated users can manage their own SIM cards
CREATE POLICY "Users can manage their SIMs" ON public.user_sims FOR ALL USING (auth.uid() = user_id);
