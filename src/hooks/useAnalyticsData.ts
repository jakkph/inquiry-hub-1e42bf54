import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SessionOverview {
  hour_bucket: string;
  referrer_type: string;
  session_count: number;
  avg_dwell_seconds: number;
  avg_max_depth: number;
  early_exits: number;
  contact_intents: number;
}

export interface AnomalyData {
  hour_bucket: string;
  rage_scrolls: number;
  early_exits: number;
  active_sessions: number;
}

export interface NavigationFlow {
  from_page: string;
  to_page: string;
  transition_count: number;
}

export interface ScrollDepthData {
  day_bucket: string;
  page_path: string;
  depth_bucket: string;
  count: number;
}

export interface SectionDwellData {
  section_key: string;
  page_path: string;
  day_bucket: string;
  event_count: number;
  avg_dwell: number;
  median_dwell: number;
}

export function useSessionsOverview() {
  return useQuery({
    queryKey: ["sessions-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions_overview_view")
        .select("*")
        .order("hour_bucket", { ascending: false })
        .limit(168); // Last 7 days of hourly data
      
      if (error) throw error;
      return (data || []) as SessionOverview[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useAnomalyTimeSeries() {
  return useQuery({
    queryKey: ["anomaly-time-series"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anomaly_time_series_view")
        .select("*")
        .order("hour_bucket", { ascending: false })
        .limit(48); // Last 48 hours
      
      if (error) throw error;
      return (data || []) as AnomalyData[];
    },
    refetchInterval: 30000,
  });
}

export function useNavigationFlow() {
  return useQuery({
    queryKey: ["navigation-flow"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("navigation_flow_view")
        .select("*")
        .order("transition_count", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []) as NavigationFlow[];
    },
    refetchInterval: 60000,
  });
}

export function useScrollDepthDistribution() {
  return useQuery({
    queryKey: ["scroll-depth-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scroll_depth_distribution_view")
        .select("*")
        .order("day_bucket", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as ScrollDepthData[];
    },
    refetchInterval: 60000,
  });
}

export function useSectionDwell() {
  return useQuery({
    queryKey: ["section-dwell"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("section_dwell_agg_view")
        .select("*")
        .order("day_bucket", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as SectionDwellData[];
    },
    refetchInterval: 60000,
  });
}

export function useLiveSessionCount() {
  return useQuery({
    queryKey: ["live-session-count"],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .gte("started_at", oneHourAgo);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useTotalStats() {
  return useQuery({
    queryKey: ["total-stats"],
    queryFn: async () => {
      const [sessionsResult, eventsResult, auditResult] = await Promise.all([
        supabase.from("sessions").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("privacy_audit").select("*", { count: "exact", head: true }),
      ]);
      
      return {
        totalSessions: sessionsResult.count || 0,
        totalEvents: eventsResult.count || 0,
        rejectedPayloads: auditResult.count || 0,
      };
    },
    refetchInterval: 30000,
  });
}
