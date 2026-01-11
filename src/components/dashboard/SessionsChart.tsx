import { useSessionsOverview } from "@/hooks/useAnalyticsData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { format } from "date-fns";

export function SessionsChart() {
  const { data, isLoading, error } = useSessionsOverview();

  // Aggregate by hour
  const aggregated = data?.reduce((acc, item) => {
    const hour = item.hour_bucket;
    if (!acc[hour]) {
      acc[hour] = { hour, count: 0, avgDwell: 0, items: 0 };
    }
    acc[hour].count += Number(item.session_count) || 0;
    acc[hour].avgDwell += Number(item.avg_dwell_seconds) || 0;
    acc[hour].items += 1;
    return acc;
  }, {} as Record<string, { hour: string; count: number; avgDwell: number; items: number }>);

  const chartData = Object.values(aggregated || {})
    .slice(0, 24)
    .reverse()
    .map((item) => ({
      time: format(new Date(item.hour), "HH:mm"),
      fullTime: format(new Date(item.hour), "MMM d, HH:mm"),
      sessions: item.count,
      avgDwell: item.items > 0 ? Math.round(item.avgDwell / item.items) : 0,
    }));

  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Sessions (24h)</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Sessions (24h)</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">No session data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Sessions (24h)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              formatter={(value: number, name: string) => [
                name === 'sessions' ? value : `${value}s`,
                name === 'sessions' ? 'Sessions' : 'Avg Dwell'
              ]}
            />
            <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill="hsl(var(--primary))" fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
