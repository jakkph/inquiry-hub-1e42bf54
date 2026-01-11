import { useScrollDepthDistribution } from "@/hooks/useAnalyticsData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const DEPTH_COLORS: Record<string, string> = {
  "0-25": "hsl(var(--error))",
  "25-50": "hsl(var(--warning))",
  "50-75": "hsl(var(--info))",
  "75-100": "hsl(var(--success))",
};

export function ScrollDepthChart() {
  const { data, isLoading, error } = useScrollDepthDistribution();

  // Aggregate by depth bucket
  const aggregated = data?.reduce((acc, item) => {
    const bucket = item.depth_bucket;
    if (!acc[bucket]) {
      acc[bucket] = 0;
    }
    acc[bucket] += Number(item.count) || 0;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(aggregated || {})
    .map(([bucket, count]) => ({
      name: bucket,
      value: count,
      fill: DEPTH_COLORS[bucket] || "hsl(var(--muted))",
    }))
    .sort((a, b) => {
      const order = ["0-25", "25-50", "50-75", "75-100"];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Scroll Depth Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Scroll Depth Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">No scroll depth data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Scroll Depth Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.375rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
              }}
              formatter={(value: number, name: string) => [
                `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                `${name}%`
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: item.fill }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">
              {item.name}%: {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
