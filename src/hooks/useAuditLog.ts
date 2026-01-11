import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "./useUserRoles";
import type { Json } from "@/integrations/supabase/types";

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useAuditLogs(limit = 100) {
  const { hasRole: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["audit-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
    enabled: isAdmin,
  });
}

export function useLogAudit() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      action,
      resourceType,
      resourceId,
      details,
    }: {
      action: string;
      resourceType: string;
      resourceId?: string;
      details?: Json;
    }) => {
      if (!user) return;

      const { error } = await supabase.from("audit_logs").insert([{
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        details: details || {},
        user_agent: navigator.userAgent,
      }]);

      if (error) throw error;
    },
  });
}
