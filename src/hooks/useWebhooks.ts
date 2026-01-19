import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Webhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export const WEBHOOK_EVENTS = [
  { id: "analytics.session.start", label: "Session Started", description: "Triggered when a new session begins" },
  { id: "analytics.session.end", label: "Session Ended", description: "Triggered when a session ends" },
  { id: "analytics.anomaly.detected", label: "Anomaly Detected", description: "Triggered when an anomaly is detected" },
  { id: "privacy.audit.complete", label: "Privacy Audit Complete", description: "Triggered when a privacy audit finishes" },
  { id: "system.alert", label: "System Alert", description: "Triggered for system-level alerts" },
] as const;

export function useWebhooks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["webhooks", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Webhook[];
    },
    enabled: !!user,
  });
}

export function useCreateWebhook() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (webhook: {
      name: string;
      url: string;
      events: string[];
      secret?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("webhooks").insert({
        user_id: user.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create webhook");
      console.error("Webhook creation error:", error);
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Webhook> & { id: string }) => {
      const { error } = await supabase
        .from("webhooks")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update webhook");
      console.error("Webhook update error:", error);
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete webhook");
      console.error("Webhook deletion error:", error);
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async (webhook: Webhook) => {
      // Simulate a test webhook call
      const testPayload = {
        event: "test.ping",
        timestamp: new Date().toISOString(),
        data: { message: "This is a test webhook payload" },
      };

      // In a real implementation, this would call an edge function
      // For now, we'll simulate success/failure
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Random success for demo
      if (Math.random() > 0.2) {
        return { success: true, statusCode: 200 };
      } else {
        throw new Error("Webhook endpoint returned error");
      }
    },
    onSuccess: () => {
      toast.success("Test webhook sent successfully");
    },
    onError: (error) => {
      toast.error("Test webhook failed");
      console.error("Webhook test error:", error);
    },
  });
}
