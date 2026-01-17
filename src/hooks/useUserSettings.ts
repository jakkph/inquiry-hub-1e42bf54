import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserSettings {
  id: string;
  user_id: string;
  operator_alias: string | null;
  theme: "dark" | "light" | "system";
  notifications_enabled: boolean;
  notification_anomalies: boolean;
  notification_privacy_alerts: boolean;
  notification_system_updates: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<UserSettings, "id" | "user_id" | "created_at" | "updated_at"> = {
  operator_alias: null,
  theme: "dark",
  notifications_enabled: true,
  notification_anomalies: true,
  notification_privacy_alerts: true,
  notification_system_updates: true,
};

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, return defaults with user info
      if (!data) {
        return {
          ...DEFAULT_SETTINGS,
          user_id: user.id,
          operator_alias: user.user_metadata?.operator_alias || null,
        } as Partial<UserSettings>;
      }

      return data as UserSettings;
    },
    enabled: !!user,
  });

  return query;
}

export function useUpdateSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      if (!user) throw new Error("Not authenticated");

      // Check if settings exist
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("user_settings")
          .update(settings)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("user_settings").insert({
          user_id: user.id,
          ...settings,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      toast.success("Settings saved");
    },
    onError: (error) => {
      toast.error("Failed to save settings");
      console.error("Settings update error:", error);
    },
  });
}
