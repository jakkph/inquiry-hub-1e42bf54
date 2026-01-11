import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "analyst" | "viewer";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export function useUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []) as UserRole[];
    },
    enabled: !!user,
  });
}

export function useHasRole(role: AppRole) {
  const { data: roles, isLoading } = useUserRoles();
  
  return {
    hasRole: roles?.some((r) => r.role === role) ?? false,
    isLoading,
  };
}

export function useIsAdmin() {
  return useHasRole("admin");
}

export function useIsAnalyst() {
  const admin = useHasRole("admin");
  const analyst = useHasRole("analyst");
  
  return {
    hasRole: admin.hasRole || analyst.hasRole,
    isLoading: admin.isLoading || analyst.isLoading,
  };
}

export function useHighestRole(): { role: AppRole | null; isLoading: boolean } {
  const { data: roles, isLoading } = useUserRoles();
  
  if (isLoading || !roles || roles.length === 0) {
    return { role: null, isLoading };
  }

  // Priority: admin > analyst > viewer
  if (roles.some((r) => r.role === "admin")) return { role: "admin", isLoading: false };
  if (roles.some((r) => r.role === "analyst")) return { role: "analyst", isLoading: false };
  if (roles.some((r) => r.role === "viewer")) return { role: "viewer", isLoading: false };
  
  return { role: null, isLoading: false };
}
