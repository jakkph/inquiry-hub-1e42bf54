import { useAnomalyTimeSeries } from "@/hooks/useAnalyticsData";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

export function AnomalyChart() {
  const { data, isLoading, error } = useAnomalyTimeSeries();

  const chartData = data?.slice().reverse().map((item) => ({
    time: format(new Date(item.hour_bucket), "HH:mm"),
    fullTime: format(new Date(item.hour_bucket), "MMM d, HH:mm"),
    rageScrolls: Number(item.rage_scrolls) || 0,
    earlyExits: Number(item.early_exits) || 0,
    activeSessions: Number(item.active_sessions) || 0,
  })) || [];

  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Anomaly Time Series</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Anomaly Time Series</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">No anomaly data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Anomaly Time Series (48h)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--error))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--error))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.375rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
              }}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullTime || ''}
            />
            <Area 
              type="monotone" 
              dataKey="rageScrolls" 
              name="Rage Scrolls"
              stroke="hsl(var(--error))" 
              fill="url(#rageGradient)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="earlyExits" 
              name="Early Exits"
              stroke="hsl(var(--warning))" 
              fill="url(#exitGradient)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-6 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-error" />
          <span className="font-mono text-[10px] text-muted-foreground">Rage Scrolls</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="font-mono text-[10px] text-muted-foreground">Early Exits</span>
        </div>
      </div>
    </div>
  );
}
