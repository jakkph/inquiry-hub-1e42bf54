import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];

export interface RealtimeSession {
  session_id: string;
  entry_path: string;
  referrer_type: string;
  device_type: string | null;
  browser_family: string | null;
  started_at: string;
  event_count: number;
  last_event_type: string | null;
  last_event_at: string | null;
}

export function useRealtimeSessions(maxSessions = 10) {
  const [sessions, setSessions] = useState<RealtimeSession[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch recent sessions on mount
  const fetchRecentSessions = useCallback(async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: sessionsData, error } = await supabase
      .from("sessions")
      .select("*")
      .gte("started_at", oneHourAgo)
      .order("started_at", { ascending: false })
      .limit(maxSessions);

    if (error) {
      console.error("Error fetching sessions:", error);
      return;
    }

    if (sessionsData) {
      // Get event counts for each session
      const sessionIds = sessionsData.map(s => s.session_id);
      const { data: eventsData } = await supabase
        .from("events")
        .select("session_id, event_type, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false });

      const eventsBySession = new Map<string, { count: number; lastType: string; lastAt: string }>();
      
      eventsData?.forEach(event => {
        const existing = eventsBySession.get(event.session_id);
        if (!existing) {
          eventsBySession.set(event.session_id, {
            count: 1,
            lastType: event.event_type,
            lastAt: event.created_at,
          });
        } else {
          existing.count++;
        }
      });

      const enrichedSessions: RealtimeSession[] = sessionsData.map(session => {
        const eventInfo = eventsBySession.get(session.session_id);
        return {
          session_id: session.session_id,
          entry_path: session.entry_path,
          referrer_type: session.referrer_type,
          device_type: session.device_type,
          browser_family: session.browser_family,
          started_at: session.started_at,
          event_count: eventInfo?.count || 0,
          last_event_type: eventInfo?.lastType || null,
          last_event_at: eventInfo?.lastAt || null,
        };
      });

      setSessions(enrichedSessions);
      setLastUpdate(new Date());
    }
  }, [maxSessions]);

  useEffect(() => {
    fetchRecentSessions();

    // Subscribe to new sessions
    const sessionsChannel = supabase
      .channel("realtime-sessions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sessions",
        },
        (payload) => {
          console.log("New session:", payload.new);
          const newSession = payload.new as Session;
          
          setSessions(prev => {
            const enrichedSession: RealtimeSession = {
              session_id: newSession.session_id,
              entry_path: newSession.entry_path,
              referrer_type: newSession.referrer_type,
              device_type: newSession.device_type,
              browser_family: newSession.browser_family,
              started_at: newSession.started_at,
              event_count: 0,
              last_event_type: null,
              last_event_at: null,
            };
            
            // Add to front, keep only maxSessions
            const updated = [enrichedSession, ...prev].slice(0, maxSessions);
            return updated;
          });
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log("Sessions channel status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    // Subscribe to new events to update session activity
    const eventsChannel = supabase
      .channel("realtime-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
        },
        (payload) => {
          console.log("New event:", payload.new);
          const newEvent = payload.new as Event;
          
          setSessions(prev => {
            return prev.map(session => {
              if (session.session_id === newEvent.session_id) {
                return {
                  ...session,
                  event_count: session.event_count + 1,
                  last_event_type: newEvent.event_type,
                  last_event_at: newEvent.created_at,
                };
              }
              return session;
            });
          });
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log("Events channel status:", status);
      });

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [fetchRecentSessions, maxSessions]);

  return { sessions, isConnected, lastUpdate, refetch: fetchRecentSessions };
}
