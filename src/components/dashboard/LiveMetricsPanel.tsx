import { MetricCard } from "@/components/MetricCard";
import { useLiveSessionCount, useTotalStats } from "@/hooks/useAnalyticsData";
import { StatusIndicator } from "@/components/StatusIndicator";

export function LiveMetricsPanel() {
  const { data: liveCount, isLoading: liveLoading } = useLiveSessionCount();
  const { data: totalStats, isLoading: statsLoading } = useTotalStats();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Live Metrics</h2>
        <StatusIndicator status="online" label="Streaming" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          label="Active Sessions (1h)"
          value={liveLoading ? "..." : liveCount?.toString() || "0"}
          subValue="last 60 minutes"
          trend="neutral"
        />
        <MetricCard 
          label="Total Sessions"
          value={statsLoading ? "..." : totalStats?.totalSessions.toLocaleString() || "0"}
          subValue="all time"
        />
        <MetricCard 
          label="Total Events"
          value={statsLoading ? "..." : totalStats?.totalEvents.toLocaleString() || "0"}
          subValue="all time"
        />
        <MetricCard 
          label="Rejected Payloads"
          value={statsLoading ? "..." : totalStats?.rejectedPayloads.toLocaleString() || "0"}
          subValue="privacy violations"
          trend={totalStats && totalStats.rejectedPayloads > 0 ? "down" : "neutral"}
        />
      </div>
    </div>
  );
}
