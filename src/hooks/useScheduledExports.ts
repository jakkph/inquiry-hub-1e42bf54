import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduledExport {
  id: string;
  user_id: string;
  name: string;
  data_type: "sessions" | "events" | "webhooks" | "audit_logs";
  format: "json" | "csv";
  schedule: "daily" | "weekly" | "monthly";
  email_to: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useScheduledExports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scheduled-exports", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("scheduled_exports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ScheduledExport[];
    },
    enabled: !!user,
  });
}

export function useCreateScheduledExport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exportConfig: {
      name: string;
      data_type: ScheduledExport["data_type"];
      format: ScheduledExport["format"];
      schedule: ScheduledExport["schedule"];
      email_to: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Calculate next run time based on schedule
      const now = new Date();
      let nextRun: Date;
      
      switch (exportConfig.schedule) {
        case "daily":
          nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "weekly":
          nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "monthly":
          nextRun = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          break;
      }

      const { error } = await supabase.from("scheduled_exports").insert({
        user_id: user.id,
        name: exportConfig.name,
        data_type: exportConfig.data_type,
        format: exportConfig.format,
        schedule: exportConfig.schedule,
        email_to: exportConfig.email_to,
        next_run_at: nextRun.toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Scheduled export created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create scheduled export");
      console.error("Scheduled export creation error:", error);
    },
  });
}

export function useUpdateScheduledExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ScheduledExport> & { id: string }) => {
      const { error } = await supabase
        .from("scheduled_exports")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Scheduled export updated");
    },
    onError: (error) => {
      toast.error("Failed to update scheduled export");
      console.error("Scheduled export update error:", error);
    },
  });
}

export function useDeleteScheduledExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_exports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Scheduled export deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete scheduled export");
      console.error("Scheduled export deletion error:", error);
    },
  });
}

export function useRunScheduledExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exportConfig: ScheduledExport) => {
      const { data, error } = await supabase.functions.invoke("run-scheduled-export", {
        body: { export_id: exportConfig.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Export sent to your email");
    },
    onError: (error) => {
      toast.error("Failed to run export");
      console.error("Export run error:", error);
    },
  });
}
