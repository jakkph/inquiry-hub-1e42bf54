import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subDays, format, startOfDay } from "date-fns";

export interface WebhookHealthMetrics {
  totalDeliveries: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  trendsData: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string;
  success: number;
  failure: number;
  avgLatency: number;
}

export function useWebhookHealth(days: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["webhook-health", user?.id, days],
    queryFn: async (): Promise<WebhookHealthMetrics> => {
      if (!user) {
        return {
          totalDeliveries: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          avgResponseTime: 0,
          p95ResponseTime: 0,
          trendsData: [],
        };
      }

      const startDate = subDays(new Date(), days);

      // Fetch delivery logs for the period
      const { data: logs, error } = await supabase
        .from("webhook_delivery_logs")
        .select(`
          *,
          webhooks:webhook_id (user_id)
        `)
        .gte("attempted_at", startDate.toISOString())
        .order("attempted_at", { ascending: true });

      if (error) throw error;

      // Filter to only user's webhooks
      const userLogs = (logs || []).filter(
        (log: { webhooks: { user_id: string } | null }) => 
          log.webhooks?.user_id === user.id
      );

      if (userLogs.length === 0) {
        return {
          totalDeliveries: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          avgResponseTime: 0,
          p95ResponseTime: 0,
          trendsData: [],
        };
      }

      // Calculate overall metrics
      const totalDeliveries = userLogs.length;
      const successCount = userLogs.filter((l: { success: boolean }) => l.success).length;
      const failureCount = totalDeliveries - successCount;
      const successRate = totalDeliveries > 0 ? (successCount / totalDeliveries) * 100 : 0;

      // Calculate response time metrics
      const responseTimes = userLogs
        .map((l: { response_time_ms: number | null }) => l.response_time_ms)
        .filter((t: number | null): t is number => t !== null)
        .sort((a: number, b: number) => a - b);

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
        : 0;

      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p95ResponseTime = responseTimes.length > 0 ? responseTimes[p95Index] || 0 : 0;

      // Calculate daily trends
      const dailyData = new Map<string, { success: number; failure: number; latencies: number[] }>();

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = format(startOfDay(subDays(new Date(), days - 1 - i)), "yyyy-MM-dd");
        dailyData.set(date, { success: 0, failure: 0, latencies: [] });
      }

      // Populate with actual data
      for (const log of userLogs) {
        const date = format(startOfDay(new Date(log.attempted_at)), "yyyy-MM-dd");
        const existing = dailyData.get(date);
        if (existing) {
          if (log.success) {
            existing.success++;
          } else {
            existing.failure++;
          }
          if (log.response_time_ms !== null) {
            existing.latencies.push(log.response_time_ms);
          }
        }
      }

      const trendsData: TrendDataPoint[] = Array.from(dailyData.entries()).map(([date, data]) => ({
        date: format(new Date(date), "MMM dd"),
        success: data.success,
        failure: data.failure,
        avgLatency: data.latencies.length > 0
          ? Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length)
          : 0,
      }));

      return {
        totalDeliveries,
        successCount,
        failureCount,
        successRate,
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime,
        trendsData,
      };
    },
    enabled: !!user,
  });
}
