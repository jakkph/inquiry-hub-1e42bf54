import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface QueryHistoryEntry {
  id: string;
  operator_id: string;
  query_input: string;
  response_signal: string | null;
  response_constraint: string | null;
  response_structural_risk: string | null;
  response_strategic_vector: string | null;
  response_diagnostics: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

export interface SaveQueryInput {
  query_input: string;
  response_signal?: string;
  response_constraint?: string;
  response_structural_risk?: string;
  response_strategic_vector?: string;
  response_diagnostics?: Record<string, unknown>;
  status?: string;
}

export function useQueryHistory(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["query-history", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("query_history" as never)
        .select("*")
        .eq("operator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as QueryHistoryEntry[];
    },
    enabled: !!user,
  });
}

export function useSaveQuery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveQueryInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("query_history" as never)
        .insert([{
          operator_id: user.id,
          query_input: input.query_input,
          response_signal: input.response_signal || null,
          response_constraint: input.response_constraint || null,
          response_structural_risk: input.response_structural_risk || null,
          response_strategic_vector: input.response_strategic_vector || null,
          response_diagnostics: input.response_diagnostics || null,
          status: input.status || "pending",
        }] as never)
        .select()
        .single();

      if (error) throw error;
      return data as QueryHistoryEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["query-history"] });
    },
  });
}

export function useDeleteQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (queryId: string) => {
      const { error } = await supabase
        .from("query_history" as never)
        .delete()
        .eq("id", queryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["query-history"] });
    },
  });
}
