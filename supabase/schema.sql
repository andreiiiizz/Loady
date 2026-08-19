-- ==============================================================================
-- LOADY (LOADWISE) POSTGRESQL + POSTGIS DATABASE SCHEMA
-- Includes crowd-sourced coverage reports, spatial indexing, abuse rate limits,
-- user SIM profiles, and gamification badges.
-- ==============================================================================

-- 1. Enable PostGIS Extension for Geospatial Queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Coverage Reports Table with PostGIS Point Geometry
CREATE TABLE IF NOT EXISTS public.coverage_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_fingerprint TEXT,
    telco TEXT NOT NULL CHECK (telco IN ('Globe', 'Smart', 'DITO', 'GOMO', 'TM', 'TNT')),
    barangay TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Metro Manila',
    province TEXT NOT NULL DEFAULT 'Luzon',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
    signal_rating INTEGER NOT NULL CHECK (signal_rating >= 1 AND signal_rating <= 5),
    network_type TEXT NOT NULL CHECK (network_type IN ('5G', '4G/LTE', '3G', 'Deadzone')),
    speed_mbps DOUBLE PRECISION,
    notes TEXT,
    upvotes INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial GIST index for high-speed radius and bounding box queries
CREATE INDEX IF NOT EXISTS idx_coverage_reports_location ON public.coverage_reports USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_coverage_reports_telco ON public.coverage_reports(telco);
CREATE INDEX IF NOT EXISTS idx_coverage_reports_created ON public.coverage_reports(created_at DESC);

-- 3. Abuse Prevention & Anti-Spam Rate Limit Trigger (500m / 1-hour window per user/device)
CREATE OR REPLACE FUNCTION public.check_coverage_report_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- Reject duplicate submission if same user or device reported within 500m in the last 1 hour
    IF EXISTS (
        SELECT 1 FROM public.coverage_reports
        WHERE (
            (NEW.user_id IS NOT NULL AND user_id = NEW.user_id)
            OR (NEW.device_fingerprint IS NOT NULL AND device_fingerprint = NEW.device_fingerprint)
        )
        AND created_at > now() - INTERVAL '1 hour'
        AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography,
            500
        )
    ) THEN
        RAISE EXCEPTION 'Rate limit exceeded: You have already submitted a signal report for this location in the last hour.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coverage_report_rate_limit ON public.coverage_reports;
CREATE TRIGGER trg_coverage_report_rate_limit
BEFORE INSERT ON public.coverage_reports
FOR EACH ROW
EXECUTE FUNCTION public.check_coverage_report_rate_limit();

-- 4. Row Level Security (RLS) for Coverage Reports
ALTER TABLE public.coverage_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on coverage reports"
    ON public.coverage_reports FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on coverage reports with rate limit"
    ON public.coverage_reports FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow upvoting coverage reports"
    ON public.coverage_reports FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 5. User SIM Profiles Table
CREATE TABLE IF NOT EXISTS public.sim_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    telco TEXT NOT NULL CHECK (telco IN ('Globe', 'Smart', 'DITO', 'GOMO', 'TM', 'TNT')),
    phone_number TEXT NOT NULL,
    active_promo TEXT,
    total_data_mb DOUBLE PRECISION NOT NULL DEFAULT 0,
    remaining_data_mb DOUBLE PRECISION NOT NULL DEFAULT 0,
    expiry_date TEXT NOT NULL,
    is_no_expiry BOOLEAN NOT NULL DEFAULT false,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    regular_balance_php DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sim_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own SIM profiles"
    ON public.sim_profiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Web Push Subscriptions Table (VAPID / Web Push Protocol)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and anon can register their push subscription"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view and update their own push subscriptions"
    ON public.push_subscriptions FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 8. Sent Promo Notifications Log (Prevents duplicate alert spam per promo cycle)
CREATE TABLE IF NOT EXISTS public.sent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT,
    sim_id TEXT NOT NULL,
    threshold_type TEXT NOT NULL CHECK (threshold_type IN ('24h', '6h', 'low_data', 'expired')),
    promo_cycle_key TEXT NOT NULL,
    payload JSONB,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sent_notification_cycle UNIQUE (sim_id, threshold_type, promo_cycle_key)
);

ALTER TABLE public.sent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role and owner can access sent notifications"
    ON public.sent_notifications FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6. User Badges Table
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    name TEXT NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and earn badges"
    ON public.badges FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- Initial Seed: Crowd Reports across Greater Manila & Provincial Expressways
-- ==============================================================================
INSERT INTO public.coverage_reports (telco, barangay, city, province, lat, lng, signal_rating, network_type, speed_mbps, notes, upvotes)
VALUES
    ('Smart', 'Ayala Triangle / Makati CBD', 'Makati City', 'Metro Manila', 14.5574, 121.0227, 5, '5G', 280.5, 'Blazing 5G speeds outdoors. Low ping on Mobile Legends.', 12),
    ('Globe', 'BGC High Street', 'Taguig City', 'Metro Manila', 14.5516, 121.0510, 5, '5G', 245.0, 'Full 5G bars throughout 5th Ave shopping strip.', 9),
    ('DITO', 'SM Megamall / Ortigas', 'Mandaluyong', 'Metro Manila', 14.5872, 121.0568, 4, '5G', 165.2, 'Strong 5G indoors and concourse level.', 6),
    ('Smart', 'SLEX Santa Rosa Toll Exit', 'Santa Rosa', 'Laguna', 14.3312, 121.0825, 5, '5G', 190.0, 'Reliable 5G along SLEX highway corridor.', 8),
    ('Globe', 'Tagaytay Ridge (Taal View)', 'Tagaytay City', 'Cavite', 14.1153, 120.9621, 4, '4G/LTE', 68.0, 'Good 4G coverage across ridge cafes; drops in deep ravines.', 15),
    ('DITO', 'Marcos Highway Mountain Pass', 'Tuba', 'Benguet', 16.3500, 120.5750, 1, 'Deadzone', 0.0, 'Deadzone for ~8km between Rosario climb and Tuba.', 22),
    ('Smart', 'Burnham Park', 'Baguio City', 'Benguet', 16.4124, 120.5980, 5, '5G', 210.0, 'Excellent 5G around Session Road and lake.', 14)
ON CONFLICT DO NOTHING;
