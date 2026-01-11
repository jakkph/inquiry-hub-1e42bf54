import { useRealtimeSessions } from "@/hooks/useRealtimeSessions";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const eventTypeColors: Record<string, string> = {
  page_view: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  scroll_depth: "bg-green-500/20 text-green-400 border-green-500/30",
  section_enter: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  section_exit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  rage_scroll: "bg-red-500/20 text-red-400 border-red-500/30",
  pause_event: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const deviceIcons: Record<string, string> = {
  desktop: "🖥️",
  mobile: "📱",
  tablet: "📱",
};

export function LiveSessionsPanel() {
  const { sessions, isConnected, lastUpdate } = useRealtimeSessions(8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Live Sessions
        </h2>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="font-mono text-[10px] text-muted-foreground">
              Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </span>
          )}
          <StatusIndicator 
            status={isConnected ? "online" : "offline"} 
            label={isConnected ? "Connected" : "Disconnected"} 
          />
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-2 border-b border-border">
          <div className="grid grid-cols-12 gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="col-span-1">Device</div>
            <div className="col-span-3">Entry Path</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2">Events</div>
            <div className="col-span-2">Last Activity</div>
            <div className="col-span-2">Started</div>
          </div>
        </div>

        <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="font-mono text-xs text-muted-foreground">
                No active sessions in the last hour
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">
                Waiting for incoming connections...
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.session_id}
                className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/20 transition-colors items-center"
              >
                <div className="col-span-1">
                  <span className="text-lg" title={session.device_type || "unknown"}>
                    {deviceIcons[session.device_type || ""] || "❓"}
                  </span>
                </div>
                
                <div className="col-span-3">
                  <code className="font-mono text-xs text-foreground truncate block">
                    {session.entry_path}
                  </code>
                </div>
                
                <div className="col-span-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {session.referrer_type}
                  </Badge>
                </div>
                
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary font-medium">
                      {session.event_count}
                    </span>
                    {session.last_event_type && (
                      <Badge 
                        variant="outline" 
                        className={`font-mono text-[9px] ${eventTypeColors[session.last_event_type] || ""}`}
                      >
                        {session.last_event_type.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="col-span-2">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {session.last_event_at 
                      ? formatDistanceToNow(new Date(session.last_event_at), { addSuffix: true })
                      : "—"
                    }
                  </span>
                </div>
                
                <div className="col-span-2">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isConnected && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-[10px] text-muted-foreground">
            Listening for real-time updates on sessions and events
          </span>
        </div>
      )}
    </div>
  );
}
