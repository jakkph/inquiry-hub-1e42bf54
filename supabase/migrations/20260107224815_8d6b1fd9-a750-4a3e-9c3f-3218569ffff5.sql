-- ============================================================
-- PRIVACY-FIRST ANALYTICS SYSTEM - FULL SCHEMA
-- Day 6 Migration - Complete Replacement
-- ============================================================

-- 1. ENUMS
-- --------------------------------------------------------
CREATE TYPE public.referrer_type AS ENUM ('direct', 'known_domain', 'unknown');
CREATE TYPE public.browser_family AS ENUM ('chrome', 'firefox', 'safari', 'edge', 'other');
CREATE TYPE public.device_type AS ENUM ('desktop', 'mobile', 'tablet', 'other');

-- 2. EVENT DEFINITIONS TABLE (schema + thresholds)
-- --------------------------------------------------------
CREATE TABLE public.event_definitions (
    event_type TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    numeric_bounds JSONB NOT NULL DEFAULT '{}'::jsonb,
    allowed_payload_shape JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_definitions_read_service_role"
ON public.event_definitions FOR SELECT
TO service_role USING (true);

-- 3. SECTIONS TABLE
-- --------------------------------------------------------
CREATE TABLE public.sections (
    section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT NOT NULL UNIQUE,
    page_path TEXT NOT NULL,
    section_name TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sections_read_service_role"
ON public.sections FOR SELECT
TO service_role USING (true);

CREATE POLICY "sections_write_service_role"
ON public.sections FOR ALL
TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_sections_page_path ON public.sections(page_path);

-- 4. SESSIONS TABLE
-- --------------------------------------------------------
CREATE TABLE public.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    referrer_type public.referrer_type NOT NULL DEFAULT 'direct',
    entry_path TEXT NOT NULL,
    anonymized_token TEXT NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    browser_family public.browser_family,
    device_type public.device_type,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_service_role_all"
ON public.sessions FOR ALL
TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_sessions_anonymized_token ON public.sessions(anonymized_token);
CREATE INDEX idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX idx_sessions_referrer_type ON public.sessions(referrer_type);
CREATE INDEX idx_sessions_entry_path ON public.sessions(entry_path);

-- 5. EVENTS TABLE
-- --------------------------------------------------------
CREATE TABLE public.events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL REFERENCES public.event_definitions(event_type),
    page_path TEXT,
    section_id UUID REFERENCES public.sections(section_id),
    depth NUMERIC(5,2),
    dwell_seconds NUMERIC(10,2),
    pause_seconds NUMERIC(10,2),
    rage_intensity NUMERIC(5,2),
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_service_role_all"
ON public.events FOR ALL
TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_events_session_id ON public.events(session_id);
CREATE INDEX idx_events_event_type ON public.events(event_type);
CREATE INDEX idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX idx_events_page_path ON public.events(page_path);

-- 6. SESSION METRICS TABLE (aggregated, mutable)
-- --------------------------------------------------------
CREATE TABLE public.session_metrics (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    total_events INTEGER NOT NULL DEFAULT 0,
    total_dwell_seconds NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_pause_seconds NUMERIC(12,2) NOT NULL DEFAULT 0,
    max_scroll_depth NUMERIC(5,2) NOT NULL DEFAULT 0,
    sections_visited INTEGER NOT NULL DEFAULT 0,
    unique_pages INTEGER NOT NULL DEFAULT 0,
    rage_events INTEGER NOT NULL DEFAULT 0,
    early_exit BOOLEAN NOT NULL DEFAULT false,
    contact_intent BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_metrics_service_role_all"
ON public.session_metrics FOR ALL
TO service_role USING (true) WITH CHECK (true);

-- 7. COHERENCE SCORES TABLE (server-only, restricted)
-- --------------------------------------------------------
CREATE TABLE public.coherence_scores (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    score NUMERIC(6,4) NOT NULL,
    components JSONB NOT NULL DEFAULT '{}'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coherence_scores ENABLE ROW LEVEL SECURITY;

-- NO policies for anon/authenticated - service_role only
CREATE POLICY "coherence_scores_service_role_only"
ON public.coherence_scores FOR ALL
TO service_role USING (true) WITH CHECK (true);

-- 8. PRIVACY AUDIT TABLE
-- --------------------------------------------------------
CREATE TABLE public.privacy_audit (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymized_token TEXT,
    event_type TEXT,
    rejection_reason TEXT NOT NULL,
    sanitized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.privacy_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "privacy_audit_service_role_only"
ON public.privacy_audit FOR ALL
TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_privacy_audit_created_at ON public.privacy_audit(created_at DESC);

-- 9. RATE LIMIT TRACKING TABLE
-- --------------------------------------------------------
CREATE TABLE public.rate_limits (
    anonymized_token TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_service_role_only"
ON public.rate_limits FOR ALL
TO service_role USING (true) WITH CHECK (true);

-- 10. SEED CANONICAL EVENT DEFINITIONS
-- --------------------------------------------------------
INSERT INTO public.event_definitions (event_type, description, required_fields, numeric_bounds, allowed_payload_shape) VALUES
('session_start', 'Initial session creation', '["entry_path"]'::jsonb, '{}'::jsonb, '{"entry_path": "string", "referrer_type": "string"}'::jsonb),
('scroll_depth', 'User scroll depth measurement', '["depth"]'::jsonb, '{"depth": {"min": 0, "max": 100}}'::jsonb, '{"depth": "number", "page_path": "string"}'::jsonb),
('section_dwell', 'Time spent in a section', '["section_id", "dwell_seconds"]'::jsonb, '{"dwell_seconds": {"min": 0, "max": 3600}}'::jsonb, '{"section_id": "string", "dwell_seconds": "number"}'::jsonb),
('pause_event', 'User pause/idle detection', '["pause_seconds"]'::jsonb, '{"pause_seconds": {"min": 0, "max": 300}}'::jsonb, '{"pause_seconds": "number", "page_path": "string"}'::jsonb),
('exit_event', 'Session exit', '[]'::jsonb, '{}'::jsonb, '{"page_path": "string"}'::jsonb),
('rage_scroll', 'Rapid scroll detection', '["rage_intensity"]'::jsonb, '{"rage_intensity": {"min": 0, "max": 10}}'::jsonb, '{"rage_intensity": "number", "page_path": "string"}'::jsonb),
('early_exit', 'Exit before threshold engagement', '[]'::jsonb, '{}'::jsonb, '{"dwell_seconds": "number"}'::jsonb),
('contact_intent', 'Contact form interaction', '[]'::jsonb, '{}'::jsonb, '{"action": "string"}'::jsonb);

-- 11. HELPER FUNCTION: Update timestamps
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_metrics_updated_at
BEFORE UPDATE ON public.session_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_definitions_updated_at
BEFORE UPDATE ON public.event_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. COHERENCE COMPUTATION FUNCTION (SECURITY DEFINER)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_coherence(p_session_id UUID)
RETURNS TABLE(score NUMERIC, components JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_metrics session_metrics%ROWTYPE;
    v_score NUMERIC(6,4);
    v_depth_score NUMERIC;
    v_dwell_score NUMERIC;
    v_engagement_score NUMERIC;
    v_penalty NUMERIC;
    v_components JSONB;
BEGIN
    -- Fetch session metrics
    SELECT * INTO v_metrics FROM session_metrics WHERE session_metrics.session_id = p_session_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0.0::NUMERIC, '{}'::JSONB;
        RETURN;
    END IF;
    
    -- Depth score: 0-100 mapped to 0-1
    v_depth_score := LEAST(v_metrics.max_scroll_depth / 100.0, 1.0);
    
    -- Dwell score: log scale, 60s = 0.5, 300s = 1.0
    v_dwell_score := LEAST(LN(GREATEST(v_metrics.total_dwell_seconds, 1) + 1) / LN(301), 1.0);
    
    -- Engagement score: sections visited + unique pages
    v_engagement_score := LEAST((v_metrics.sections_visited * 0.15) + (v_metrics.unique_pages * 0.1), 1.0);
    
    -- Penalties
    v_penalty := 0;
    IF v_metrics.early_exit THEN v_penalty := v_penalty + 0.3; END IF;
    IF v_metrics.rage_events > 0 THEN v_penalty := v_penalty + (v_metrics.rage_events * 0.05); END IF;
    
    -- Weighted final score
    v_score := GREATEST(
        (v_depth_score * 0.25) + (v_dwell_score * 0.35) + (v_engagement_score * 0.25) + 
        (CASE WHEN v_metrics.contact_intent THEN 0.15 ELSE 0 END) - v_penalty,
        0
    );
    
    v_components := jsonb_build_object(
        'depth_score', ROUND(v_depth_score, 4),
        'dwell_score', ROUND(v_dwell_score, 4),
        'engagement_score', ROUND(v_engagement_score, 4),
        'contact_bonus', CASE WHEN v_metrics.contact_intent THEN 0.15 ELSE 0 END,
        'penalty', ROUND(v_penalty, 4)
    );
    
    -- Upsert to coherence_scores
    INSERT INTO coherence_scores (session_id, score, components, computed_at)
    VALUES (p_session_id, v_score, v_components, now())
    ON CONFLICT (session_id) DO UPDATE SET
        score = EXCLUDED.score,
        components = EXCLUDED.components,
        computed_at = EXCLUDED.computed_at;
    
    RETURN QUERY SELECT v_score, v_components;
END;
$$;

-- Revoke from public roles
REVOKE EXECUTE ON FUNCTION public.compute_coherence(UUID) FROM anon, authenticated;

-- 13. AGGREGATED VIEWS (READ-ONLY, NEUTRAL)
-- --------------------------------------------------------

-- Sessions Overview
CREATE OR REPLACE VIEW public.sessions_overview_view AS
SELECT 
    DATE_TRUNC('hour', s.started_at) AS hour_bucket,
    s.referrer_type,
    COUNT(*) AS session_count,
    AVG(sm.total_dwell_seconds) AS avg_dwell_seconds,
    AVG(sm.max_scroll_depth) AS avg_max_depth,
    SUM(CASE WHEN sm.early_exit THEN 1 ELSE 0 END) AS early_exits,
    SUM(CASE WHEN sm.contact_intent THEN 1 ELSE 0 END) AS contact_intents
FROM sessions s
LEFT JOIN session_metrics sm ON s.session_id = sm.session_id
GROUP BY DATE_TRUNC('hour', s.started_at), s.referrer_type;

-- Section Dwell Aggregate
CREATE OR REPLACE VIEW public.section_dwell_agg_view AS
SELECT 
    sec.section_key,
    sec.page_path,
    DATE_TRUNC('day', e.created_at) AS day_bucket,
    COUNT(*) AS event_count,
    AVG(e.dwell_seconds) AS avg_dwell,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.dwell_seconds) AS median_dwell
FROM events e
JOIN sections sec ON e.section_id = sec.section_id
WHERE e.event_type = 'section_dwell'
GROUP BY sec.section_key, sec.page_path, DATE_TRUNC('day', e.created_at);

-- Scroll Depth Distribution
CREATE OR REPLACE VIEW public.scroll_depth_distribution_view AS
SELECT 
    DATE_TRUNC('day', e.created_at) AS day_bucket,
    e.page_path,
    CASE 
        WHEN e.depth < 25 THEN '0-25'
        WHEN e.depth < 50 THEN '25-50'
        WHEN e.depth < 75 THEN '50-75'
        ELSE '75-100'
    END AS depth_bucket,
    COUNT(*) AS count
FROM events e
WHERE e.event_type = 'scroll_depth' AND e.depth IS NOT NULL
GROUP BY DATE_TRUNC('day', e.created_at), e.page_path, 
    CASE 
        WHEN e.depth < 25 THEN '0-25'
        WHEN e.depth < 50 THEN '25-50'
        WHEN e.depth < 75 THEN '50-75'
        ELSE '75-100'
    END;

-- Navigation Flow
CREATE OR REPLACE VIEW public.navigation_flow_view AS
SELECT 
    e1.page_path AS from_page,
    e2.page_path AS to_page,
    COUNT(*) AS transition_count
FROM events e1
JOIN events e2 ON e1.session_id = e2.session_id 
    AND e2.created_at > e1.created_at
    AND e2.created_at <= e1.created_at + INTERVAL '30 seconds'
WHERE e1.page_path IS NOT NULL AND e2.page_path IS NOT NULL
    AND e1.page_path != e2.page_path
GROUP BY e1.page_path, e2.page_path
HAVING COUNT(*) > 1;

-- Anomaly Time Series
CREATE OR REPLACE VIEW public.anomaly_time_series_view AS
SELECT 
    DATE_TRUNC('hour', e.created_at) AS hour_bucket,
    SUM(CASE WHEN e.event_type = 'rage_scroll' THEN 1 ELSE 0 END) AS rage_scrolls,
    SUM(CASE WHEN e.event_type = 'early_exit' THEN 1 ELSE 0 END) AS early_exits,
    COUNT(DISTINCT e.session_id) AS active_sessions
FROM events e
GROUP BY DATE_TRUNC('hour', e.created_at);

-- 14. BACKFILL FUNCTION
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_session_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    INSERT INTO session_metrics (
        session_id,
        total_events,
        total_dwell_seconds,
        total_pause_seconds,
        max_scroll_depth,
        sections_visited,
        unique_pages,
        rage_events,
        early_exit,
        contact_intent
    )
    SELECT 
        e.session_id,
        COUNT(*),
        COALESCE(SUM(e.dwell_seconds), 0),
        COALESCE(SUM(e.pause_seconds), 0),
        COALESCE(MAX(e.depth), 0),
        COUNT(DISTINCT e.section_id),
        COUNT(DISTINCT e.page_path),
        SUM(CASE WHEN e.event_type = 'rage_scroll' THEN 1 ELSE 0 END),
        BOOL_OR(e.event_type = 'early_exit'),
        BOOL_OR(e.event_type = 'contact_intent')
    FROM events e
    GROUP BY e.session_id
    ON CONFLICT (session_id) DO UPDATE SET
        total_events = EXCLUDED.total_events,
        total_dwell_seconds = EXCLUDED.total_dwell_seconds,
        total_pause_seconds = EXCLUDED.total_pause_seconds,
        max_scroll_depth = EXCLUDED.max_scroll_depth,
        sections_visited = EXCLUDED.sections_visited,
        unique_pages = EXCLUDED.unique_pages,
        rage_events = EXCLUDED.rage_events,
        early_exit = EXCLUDED.early_exit,
        contact_intent = EXCLUDED.contact_intent,
        updated_at = now();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.backfill_session_metrics() FROM anon, authenticated;

-- 15. RECOMPUTE ALL COHERENCE SCORES
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_all_coherence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_session IN SELECT session_id FROM session_metrics LOOP
        PERFORM compute_coherence(v_session.session_id);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_all_coherence() FROM anon, authenticated;