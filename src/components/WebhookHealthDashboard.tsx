import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useState } from "react";
import { useWebhookHealth } from "@/hooks/useWebhookHealth";

const chartConfig = {
  success: {
    label: "Success",
    color: "hsl(var(--chart-1))",
  },
  failure: {
    label: "Failure",
    color: "hsl(var(--destructive))",
  },
  avgLatency: {
    label: "Avg Latency",
    color: "hsl(var(--chart-2))",
  },
};

export function WebhookHealthDashboard() {
  const [timeRange, setTimeRange] = useState<number>(7);
  const { data: health, isLoading } = useWebhookHealth(timeRange);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-mono flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Webhook Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  const metrics = health || {
    totalDeliveries: 0,
    successCount: 0,
    failureCount: 0,
    successRate: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0,
    trendsData: [],
  };

  // Calculate trend indicator
  const getTrendIndicator = () => {
    if (metrics.trendsData.length < 2) return null;
    
    const recent = metrics.trendsData.slice(-3);
    const earlier = metrics.trendsData.slice(0, 3);
    
    const recentFailRate = recent.reduce((a, b) => a + b.failure, 0) / Math.max(recent.reduce((a, b) => a + b.success + b.failure, 0), 1);
    const earlierFailRate = earlier.reduce((a, b) => a + b.failure, 0) / Math.max(earlier.reduce((a, b) => a + b.success + b.failure, 0), 1);
    
    if (recentFailRate < earlierFailRate - 0.05) return "improving";
    if (recentFailRate > earlierFailRate + 0.05) return "degrading";
    return "stable";
  };

  const trend = getTrendIndicator();

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-mono flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Webhook Health
          </CardTitle>
          <CardDescription>
            Monitor delivery success rates and response times
          </CardDescription>
        </div>
        <Select
          value={String(timeRange)}
          onValueChange={(v) => setTimeRange(Number(v))}
        >
          <SelectTrigger className="w-32 font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Total Deliveries"
            value={metrics.totalDeliveries}
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard
            label="Success Rate"
            value={`${metrics.successRate.toFixed(1)}%`}
            icon={
              metrics.successRate >= 95 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : metrics.successRate >= 80 ? (
                <CheckCircle2 className="h-4 w-4 text-yellow-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )
            }
            badge={
              <Badge
                variant={metrics.successRate >= 95 ? "default" : metrics.successRate >= 80 ? "secondary" : "destructive"}
                className="font-mono text-xs"
              >
                {metrics.successRate >= 95 ? "Healthy" : metrics.successRate >= 80 ? "Warning" : "Critical"}
              </Badge>
            }
          />
          <MetricCard
            label="Avg Response Time"
            value={`${metrics.avgResponseTime}ms`}
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            subtext={`P95: ${metrics.p95ResponseTime}ms`}
          />
          <MetricCard
            label="Trend"
            value={trend === "improving" ? "Improving" : trend === "degrading" ? "Degrading" : "Stable"}
            icon={
              trend === "improving" ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : trend === "degrading" ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )
            }
          />
        </div>

        {/* Charts */}
        {metrics.trendsData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Success/Failure Bar Chart */}
            <div>
              <h4 className="text-sm font-mono text-muted-foreground mb-3">Delivery Outcomes</h4>
              <ChartContainer config={chartConfig} className="h-48">
                <BarChart data={metrics.trendsData}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="success"
                    stackId="a"
                    fill="var(--color-success)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="failure"
                    stackId="a"
                    fill="var(--color-failure)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Latency Line Chart */}
            <div>
              <h4 className="text-sm font-mono text-muted-foreground mb-3">Average Latency (ms)</h4>
              <ChartContainer config={chartConfig} className="h-48">
                <LineChart data={metrics.trendsData}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="avgLatency"
                    stroke="var(--color-avgLatency)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-mono">No delivery data available</p>
            <p className="text-sm mt-1">Webhook deliveries will appear here once events are triggered</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  subtext?: string;
}

function MetricCard({ label, value, icon, badge, subtext }: MetricCardProps) {
  return (
    <div className="p-4 border border-border/50 rounded-lg bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold font-mono">{value}</span>
        {badge}
      </div>
      {subtext && (
        <span className="text-xs text-muted-foreground font-mono">{subtext}</span>
      )}
    </div>
  );
}
