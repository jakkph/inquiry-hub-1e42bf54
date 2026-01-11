import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RealtimeEvent {
  event_id: string;
  event_type: string;
  session_id: string;
  page_path: string | null;
  depth: number | null;
  dwell_seconds: number | null;
  rage_intensity: number | null;
  pause_seconds: number | null;
  created_at: string;
}

const MAX_EVENTS = 50;

export function useRealtimeEvents() {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial recent events
  const fetchInitialEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("event_id, event_type, session_id, page_path, depth, dwell_seconds, rage_intensity, pause_seconds, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_EVENTS);

    if (!error && data) {
      setEvents(data as RealtimeEvent[]);
    }
  }, []);

  useEffect(() => {
    fetchInitialEvents();

    // Subscribe to new events
    const channel = supabase
      .channel("realtime-events-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
        },
        (payload) => {
          const newEvent = payload.new as RealtimeEvent;
          setEvents((prev) => {
            const updated = [newEvent, ...prev];
            return updated.slice(0, MAX_EVENTS);
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialEvents]);

  return { events, isConnected };
}
