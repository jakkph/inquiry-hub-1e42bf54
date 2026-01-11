import { useSessionsOverview } from "@/hooks/useAnalyticsData";

const REFERRER_COLORS: Record<string, string> = {
  direct: "hsl(var(--primary))",
  known_domain: "hsl(var(--info))",
  unknown: "hsl(var(--muted-foreground))",
};

export function ReferrerBreakdown() {
  const { data, isLoading, error } = useSessionsOverview();

  // Aggregate by referrer type
  const aggregated = data?.reduce((acc, item) => {
    const type = item.referrer_type;
    if (!acc[type]) {
      acc[type] = { count: 0, avgDwell: 0, items: 0 };
    }
    acc[type].count += Number(item.session_count) || 0;
    acc[type].avgDwell += Number(item.avg_dwell_seconds) || 0;
    acc[type].items += 1;
    return acc;
  }, {} as Record<string, { count: number; avgDwell: number; items: number }>);

  const breakdown = Object.entries(aggregated || {}).map(([type, stats]) => ({
    type,
    count: stats.count,
    avgDwell: stats.items > 0 ? Math.round(stats.avgDwell / stats.items) : 0,
    color: REFERRER_COLORS[type] || "hsl(var(--muted))",
  }));

  const total = breakdown.reduce((sum, d) => sum + d.count, 0);

  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Referrer Breakdown</h3>
        <div className="h-40 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || breakdown.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Referrer Breakdown</h3>
        <div className="h-40 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">No referrer data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Referrer Breakdown</h3>
      
      {/* Progress bar visualization */}
      <div className="h-3 rounded-full overflow-hidden bg-secondary/30 flex mb-4">
        {breakdown.map((item) => (
          <div
            key={item.type}
            className="h-full transition-all"
            style={{
              width: total > 0 ? `${(item.count / total) * 100}%` : '0%',
              backgroundColor: item.color,
            }}
          />
        ))}
      </div>

      <div className="space-y-3">
        {breakdown.map((item) => (
          <div key={item.type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span 
                className="h-2 w-2 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="font-mono text-xs text-foreground capitalize">
                {item.type.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-muted-foreground">
                {total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%
              </span>
              <span className="font-mono text-xs text-foreground w-16 text-right">
                {item.count.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
