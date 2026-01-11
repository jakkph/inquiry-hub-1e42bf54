import { useRealtimeEvents, RealtimeEvent } from "@/hooks/useRealtimeEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  MousePointer, 
  Clock, 
  Eye, 
  Zap, 
  Pause,
  ArrowDown,
  Play
} from "lucide-react";

const eventTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  session_start: { icon: Play, color: "bg-green-500/20 text-green-400", label: "Session Start" },
  scroll_depth: { icon: ArrowDown, color: "bg-blue-500/20 text-blue-400", label: "Scroll" },
  section_dwell: { icon: Eye, color: "bg-purple-500/20 text-purple-400", label: "Dwell" },
  rage_scroll: { icon: Zap, color: "bg-red-500/20 text-red-400", label: "Rage" },
  pause_event: { icon: Pause, color: "bg-amber-500/20 text-amber-400", label: "Pause" },
  page_view: { icon: MousePointer, color: "bg-cyan-500/20 text-cyan-400", label: "Page View" },
};

function getEventConfig(eventType: string) {
  return eventTypeConfig[eventType] || { 
    icon: Activity, 
    color: "bg-muted text-muted-foreground", 
    label: eventType 
  };
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit", 
    second: "2-digit",
    hour12: false 
  });
}

function formatTimeAgo(timestamp: string) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);
  
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function EventRow({ event }: { event: RealtimeEvent }) {
  const config = getEventConfig(event.event_type);
  const Icon = config.icon;

  const getEventDetail = () => {
    if (event.depth !== null) return `${Math.round(event.depth)}%`;
    if (event.dwell_seconds !== null) return `${event.dwell_seconds.toFixed(1)}s`;
    if (event.rage_intensity !== null) return `×${event.rage_intensity}`;
    if (event.pause_seconds !== null) return `${event.pause_seconds.toFixed(0)}s`;
    return null;
  };

  const detail = getEventDetail();

  return (
    <div className="flex items-center gap-3 py-2 px-3 hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
      <div className={`p-1.5 rounded-md ${config.color}`}>
        <Icon className="h-3 w-3" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
            {config.label}
          </Badge>
          {detail && (
            <span className="font-mono text-[10px] text-primary font-medium">
              {detail}
            </span>
          )}
        </div>
        {event.page_path && (
          <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
            {event.page_path}
          </p>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="font-mono text-[10px] text-muted-foreground">
          {formatTime(event.created_at)}
        </p>
        <p className="font-mono text-[9px] text-muted-foreground/60">
          {formatTimeAgo(event.created_at)}
        </p>
      </div>
    </div>
  );
}

export function LiveEventFeed() {
  const { events, isConnected } = useRealtimeEvents();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-sm text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Event Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-muted"}`} />
            <span className="font-mono text-[10px] text-muted-foreground">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-64 px-4">
            <div className="text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="font-mono text-xs text-muted-foreground">
                Waiting for events...
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">
                Events will appear here in real-time
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="divide-y divide-border/30">
              {events.map((event) => (
                <EventRow key={event.event_id} event={event} />
              ))}
            </div>
          </ScrollArea>
        )}
        
        {/* Footer stats */}
        <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            {events.length} events in buffer
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            Max: 50 events
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
