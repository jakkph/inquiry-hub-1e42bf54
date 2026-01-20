import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WebhookDeliveryLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  success: boolean;
  error_message: string | null;
  attempted_at: string;
  created_at: string;
}

export function useWebhookDeliveryLogs(webhookId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["webhook-delivery-logs", webhookId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("webhook_delivery_logs")
        .select("*")
        .order("attempted_at", { ascending: false })
        .limit(50);

      if (webhookId) {
        query = query.eq("webhook_id", webhookId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WebhookDeliveryLog[];
    },
    enabled: !!user,
  });
}

export function useAllWebhookDeliveryLogs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-webhook-delivery-logs", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("webhook_delivery_logs")
        .select(`
          *,
          webhooks:webhook_id (name)
        `)
        .order("attempted_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as (WebhookDeliveryLog & { webhooks: { name: string } | null })[];
    },
    enabled: !!user,
  });
}
