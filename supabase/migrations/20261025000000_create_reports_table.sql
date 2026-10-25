-- DrainGuard Citizen Reports Table Migration
-- Production schema for durable, zero-cost PostgreSQL / Supabase storage

CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    zone_id TEXT,
    photo_url TEXT,
    blockage_type TEXT NOT NULL CHECK (blockage_type IN ('plastic', 'silt', 'debris', 'construction', 'none', 'unknown')),
    severity SMALLINT NOT NULL CHECK (severity IN (1, 2, 3)),
    summary VARCHAR(250) NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'cleared')),
    source TEXT NOT NULL DEFAULT 'citizen' CHECK (source IN ('citizen', 'seed', 'municipal_inspection')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Fast spatial & status indexes
CREATE INDEX IF NOT EXISTS idx_reports_zone_id ON public.reports(zone_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_lat_lng ON public.reports(lat, lng);

-- Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access to verified reports
CREATE POLICY "Allow public read access to reports"
    ON public.reports
    FOR SELECT
    USING (true);

-- Allow public insert through validated API server (or direct anon if enabled)
CREATE POLICY "Allow public insert of new reports"
    ON public.reports
    FOR INSERT
    WITH CHECK (
        lat BETWEEN -90 AND 90 AND
        lng BETWEEN -180 AND 180 AND
        status = 'open' AND
        source = 'citizen'
    );

-- Allow service role full management for municipal dispatch updates
CREATE POLICY "Allow service role full access"
    ON public.reports
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
