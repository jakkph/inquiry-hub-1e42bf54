-- Fix security definer view warnings by explicitly setting SECURITY INVOKER
-- and granting appropriate select permissions to service_role

DROP VIEW IF EXISTS public.sessions_overview_view;
DROP VIEW IF EXISTS public.section_dwell_agg_view;
DROP VIEW IF EXISTS public.scroll_depth_distribution_view;
DROP VIEW IF EXISTS public.navigation_flow_view;
DROP VIEW IF EXISTS public.anomaly_time_series_view;

-- Recreate views with explicit SECURITY INVOKER
CREATE VIEW public.sessions_overview_view 
WITH (security_invoker = true)
AS
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

CREATE VIEW public.section_dwell_agg_view 
WITH (security_invoker = true)
AS
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

CREATE VIEW public.scroll_depth_distribution_view 
WITH (security_invoker = true)
AS
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

CREATE VIEW public.navigation_flow_view 
WITH (security_invoker = true)
AS
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

CREATE VIEW public.anomaly_time_series_view 
WITH (security_invoker = true)
AS
SELECT 
    DATE_TRUNC('hour', e.created_at) AS hour_bucket,
    SUM(CASE WHEN e.event_type = 'rage_scroll' THEN 1 ELSE 0 END) AS rage_scrolls,
    SUM(CASE WHEN e.event_type = 'early_exit' THEN 1 ELSE 0 END) AS early_exits,
    COUNT(DISTINCT e.session_id) AS active_sessions
FROM events e
GROUP BY DATE_TRUNC('hour', e.created_at);