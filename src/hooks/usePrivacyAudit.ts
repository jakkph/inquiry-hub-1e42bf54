import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrivacyAuditEntry {
  audit_id: string;
  created_at: string;
  event_type: string | null;
  rejection_reason: string;
  sanitized_payload: Record<string, unknown>;
  source_ip_hash: string | null;
  anonymized_token: string | null;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export function usePrivacyAudit(limit = 100, dateRange?: DateRange) {
  return useQuery({
    queryKey: ["privacy-audit", limit, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("privacy_audit" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PrivacyAuditEntry[];
    },
    refetchInterval: 30000,
  });
}

export function usePrivacyAuditStats() {
  return useQuery({
    queryKey: ["privacy-audit-stats"],
    queryFn: async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [last24h, last7d, byReason] = await Promise.all([
        supabase
          .from("privacy_audit" as never)
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneDayAgo),
        supabase
          .from("privacy_audit" as never)
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("privacy_audit" as never)
          .select("rejection_reason")
          .gte("created_at", sevenDaysAgo),
      ]);

      const reasonCounts: Record<string, number> = {};
      if (byReason.data) {
        for (const entry of byReason.data as { rejection_reason: string }[]) {
          const reason = entry.rejection_reason;
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }
      }

      return {
        last24h: last24h.count || 0,
        last7d: last7d.count || 0,
        byReason: reasonCounts,
      };
    },
    refetchInterval: 60000,
  });
}
