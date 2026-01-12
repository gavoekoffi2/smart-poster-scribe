import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = 'super_admin' | 'admin' | 'content_manager' | 'designer' | 'user';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  created_at: string;
}

export interface RolePermission {
  role: AppRole;
  permission: string;
}

const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 100,
  admin: 80,
  content_manager: 60,
  designer: 40,
  user: 20,
};

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Administrateur',
  admin: 'Administrateur',
  content_manager: 'Gestionnaire de contenu',
  designer: 'Graphiste',
  user: 'Utilisateur',
};

export function useAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoleAndPermissions = async () => {
      if (!user) {
        setUserRole(null);
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user's highest role
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (roleError) {
          console.error("Error fetching role:", roleError);
          setUserRole(null);
          setPermissions([]);
          setIsLoading(false);
          return;
        }

        if (!roleData || roleData.length === 0) {
          setUserRole(null);
          setPermissions([]);
          setIsLoading(false);
          return;
        }

        // Get highest role
        let highestRole: AppRole = 'user';
        let highestLevel = 0;
        
        for (const r of roleData) {
          const role = r.role as AppRole;
          const level = ROLE_HIERARCHY[role] || 0;
          if (level > highestLevel) {
            highestLevel = level;
            highestRole = role;
          }
        }

        setUserRole(highestRole);

        // Fetch permissions for this role
        const { data: permData, error: permError } = await supabase
          .from("role_permissions")
          .select("permission")
          .eq("role", highestRole);

        if (permError) {
          console.error("Error fetching permissions:", permError);
          setPermissions([]);
        } else {
          setPermissions(permData?.map(p => p.permission) || []);
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        setUserRole(null);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchRoleAndPermissions();
    }
  }, [user, authLoading]);

  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasRole = useCallback((role: AppRole): boolean => {
    if (!userRole) return false;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role];
  }, [userRole]);

  const canManageRole = useCallback((targetRole: AppRole): boolean => {
    if (!userRole) return false;
    // Super admin can manage all
    if (userRole === 'super_admin') return true;
    // Admin can manage content_manager, designer, user
    if (userRole === 'admin') {
      return ['content_manager', 'designer', 'user'].includes(targetRole);
    }
    return false;
  }, [userRole]);

  const getRoleLabel = useCallback((role: AppRole): string => {
    return ROLE_LABELS[role] || role;
  }, []);

  const assignRole = useCallback(async (targetUserId: string, role: AppRole): Promise<boolean> => {
    if (!user || !canManageRole(role)) return false;

    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ 
          user_id: targetUserId, 
          role: role,
          granted_by: user.id
        });

      if (error) {
        console.error("Error assigning role:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error assigning role:", err);
      return false;
    }
  }, [user, canManageRole]);

  const removeRole = useCallback(async (targetUserId: string, role: AppRole): Promise<boolean> => {
    if (!user || !canManageRole(role)) return false;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("role", role);

      if (error) {
        console.error("Error removing role:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error removing role:", err);
      return false;
    }
  }, [user, canManageRole]);

  return {
    userRole,
    permissions,
    isLoading: authLoading || isLoading,
    isSuperAdmin: userRole === 'super_admin',
    isAdmin: hasRole('admin'),
    isContentManager: hasRole('content_manager'),
    hasPermission,
    hasRole,
    canManageRole,
    getRoleLabel,
    assignRole,
    removeRole,
    ROLE_HIERARCHY,
    ROLE_LABELS,
  };
}
