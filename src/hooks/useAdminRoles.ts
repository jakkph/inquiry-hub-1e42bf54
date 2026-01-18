import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin, AppRole } from "./useUserRoles";
import { useToast } from "@/hooks/use-toast";

export interface UserWithRoles {
  user_id: string;
  email: string;
  created_at: string;
  roles: AppRole[];
}

// Fetch all users with their roles (admin only)
export function useAllUsersWithRoles() {
  const { user } = useAuth();
  const { hasRole: isAdmin, isLoading: adminLoading } = useIsAdmin();

  return useQuery({
    queryKey: ["admin-all-users-roles"],
    queryFn: async () => {
      // First get all user_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Get all user_settings to get emails (since we can't access auth.users)
      const { data: settingsData, error: settingsError } = await supabase
        .from("user_settings")
        .select("user_id, operator_alias, created_at");

      if (settingsError) throw settingsError;

      // Group roles by user_id
      const usersMap = new Map<string, UserWithRoles>();

      // Add users from roles
      rolesData?.forEach((role) => {
        if (!usersMap.has(role.user_id)) {
          usersMap.set(role.user_id, {
            user_id: role.user_id,
            email: "", // Will be populated from settings or remain as user_id
            created_at: role.created_at,
            roles: [],
          });
        }
        usersMap.get(role.user_id)!.roles.push(role.role);
      });

      // Add display info from settings
      settingsData?.forEach((setting) => {
        if (usersMap.has(setting.user_id)) {
          const user = usersMap.get(setting.user_id)!;
          user.email = setting.operator_alias || `User ${setting.user_id.slice(0, 8)}`;
        } else {
          // User has settings but no roles
          usersMap.set(setting.user_id, {
            user_id: setting.user_id,
            email: setting.operator_alias || `User ${setting.user_id.slice(0, 8)}`,
            created_at: setting.created_at,
            roles: [],
          });
        }
      });

      return Array.from(usersMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user && isAdmin && !adminLoading,
  });
}

// Assign a role to a user
export function useAssignRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if role already exists
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();

      if (existing) {
        throw new Error("User already has this role");
      }

      const { data, error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users-roles"] });
      toast({
        title: "Role assigned",
        description: "The role has been successfully assigned to the user.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error assigning role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Remove a role from a user
export function useRemoveRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users-roles"] });
      toast({
        title: "Role removed",
        description: "The role has been successfully removed from the user.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
