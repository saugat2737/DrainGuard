-- ==============================================================================
-- DrainGuard Complete Database Schema & Initial Data Seed
-- Execute this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create public.reports table
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

-- 2. Create performance & query indexes
CREATE INDEX IF NOT EXISTS idx_reports_zone_id ON public.reports(zone_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_lat_lng ON public.reports(lat, lng);

-- 3. Configure Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow public read access to reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public insert of new reports" ON public.reports;
DROP POLICY IF EXISTS "Allow service role full access" ON public.reports;

-- Policy A: Everyone (citizens, commuters, municipal staff) can read reports
CREATE POLICY "Allow public read access to reports"
    ON public.reports
    FOR SELECT
    USING (true);

-- Policy B: Citizens can submit new reports
CREATE POLICY "Allow public insert of new reports"
    ON public.reports
    FOR INSERT
    WITH CHECK (
        lat BETWEEN -90 AND 90 AND
        lng BETWEEN -180 AND 180 AND
        status = 'open'
    );

-- Policy C: Service role has full permissions for municipal workflow (updating status, etc.)
CREATE POLICY "Allow service role full access"
    ON public.reports
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'anon')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'anon');

-- 4. Seed verified Tumakuru ground-truth reports from reports.seed.json
INSERT INTO public.reports (id, lat, lng, zone_id, photo_url, blockage_type, severity, summary, status, source, created_at)
VALUES
    ('rep-001', 13.3415, 77.1120, 'Z01', NULL, 'plastic', 3, 'Storm drain clogged with plastic bottles and polythene waste near lake inlet.', 'open', 'seed', '2026-10-24T08:30:00.000Z'),
    ('rep-002', 13.3400, 77.1140, 'Z01', NULL, 'silt', 2, 'Dense mud and road silt accumulation blocking culvert flow.', 'open', 'seed', '2026-10-24T09:15:00.000Z'),
    ('rep-003', 13.3360, 77.1160, 'Z06', NULL, 'debris', 3, 'Underpass entrance drain blocked with tree branches and roadside rubbish.', 'open', 'seed', '2026-10-24T10:00:00.000Z'),
    ('rep-004', 13.3465, 77.1215, 'Z03', NULL, 'plastic', 2, 'Open gutter choked with discarded commercial packaging.', 'assigned', 'seed', '2026-10-24T10:45:00.000Z'),
    ('rep-005', 13.3380, 77.1135, 'Z02', NULL, 'silt', 2, 'Heavy road sediment reducing main drain capacity by half.', 'open', 'seed', '2026-10-24T11:20:00.000Z'),
    ('rep-006', 13.3375, 77.1030, 'Z08', NULL, 'construction', 3, 'Concrete rubble and discarded sand choking market outlet drain.', 'open', 'seed', '2026-10-24T12:00:00.000Z'),
    ('rep-007', 13.3368, 77.1165, 'Z06', NULL, 'plastic', 1, 'Minor surface plastic cups on drain grate.', 'cleared', 'seed', '2026-10-24T07:15:00.000Z'),
    ('rep-008', 13.3525, 77.1290, 'Z07', NULL, 'debris', 1, 'Fallen leaves and twigs covering curb inlet.', 'open', 'seed', '2026-10-24T13:10:00.000Z')
ON CONFLICT (id) DO NOTHING;
