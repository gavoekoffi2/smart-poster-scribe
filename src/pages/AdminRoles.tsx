import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin, type AppRole } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Shield, Crown, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  roles: AppRole[];
}

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  admin: "bg-primary/20 text-primary border-primary/30",
  content_manager: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  designer: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  user: "bg-muted text-muted-foreground",
};

export default function AdminRoles() {
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin, canManageRole, assignRole, removeRole, getRoleLabel } = useAdmin();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { if (user) fetchUsers(); }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesByUser: Record<string, AppRole[]> = {};
      for (const r of rolesRes.data || []) {
        if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
        rolesByUser[r.user_id].push(r.role as AppRole);
      }

      const usersWithRoles: UserWithRole[] = (profilesRes.data || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        created_at: p.created_at,
        roles: rolesByUser[p.user_id] || [],
      }));
      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (targetUserId: string, role: AppRole) => {
    const success = await assignRole(targetUserId, role);
    if (success) {
      toast.success(`Rôle "${getRoleLabel(role)}" attribué`);
      fetchUsers();
    } else {
      toast.error("Erreur lors de l'attribution du rôle");
    }
  };

  const handleRemoveRole = async (targetUserId: string, role: AppRole) => {
    if (!confirm(`Retirer le rôle "${getRoleLabel(role)}" ?`)) return;
    const success = await removeRole(targetUserId, role);
    if (success) {
      toast.success(`Rôle "${getRoleLabel(role)}" retiré`);
      fetchUsers();
    } else {
      toast.error("Erreur lors du retrait du rôle");
    }
  };

  const filteredUsers = users.filter(u =>
    !searchQuery ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_id.includes(searchQuery)
  );

  const getAvailableRoles = (): AppRole[] => {
    const roles: AppRole[] = [];
    if (isSuperAdmin) roles.push("admin", "content_manager", "designer");
    else if (isAdmin) roles.push("content_manager", "designer");
    return roles;
  };

  return (
    <AdminLayout requiredPermission="manage_admins">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />Gestion des Rôles
        </h2>
        <p className="text-muted-foreground">Attribuez et gérez les rôles des utilisateurs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/60 border-border/40"><CardContent className="pt-6"><div className="text-2xl font-bold">{users.length}</div><p className="text-xs text-muted-foreground">Total utilisateurs</p></CardContent></Card>
        <Card className="bg-card/60 border-border/40"><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{users.filter(u => u.roles.includes("admin") || u.roles.includes("super_admin")).length}</div><p className="text-xs text-muted-foreground">Administrateurs</p></CardContent></Card>
        <Card className="bg-card/60 border-border/40"><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-500">{users.filter(u => u.roles.includes("content_manager")).length}</div><p className="text-xs text-muted-foreground">Content Managers</p></CardContent></Card>
        <Card className="bg-card/60 border-border/40"><CardContent className="pt-6"><div className="text-2xl font-bold text-purple-500">{users.filter(u => u.roles.includes("designer")).length}</div><p className="text-xs text-muted-foreground">Graphistes</p></CardContent></Card>
      </div>

      {/* Search */}
      <Card className="bg-card/60 border-border/40 mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher par nom ou email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Utilisateurs ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôles actuels</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{u.full_name || "Sans nom"}</p>
                        <p className="text-xs text-muted-foreground">{u.email || u.user_id.substring(0, 16) + "..."}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <Badge variant="secondary" className="text-xs">Utilisateur</Badge>
                        ) : (
                          u.roles.map(role => (
                            <Badge key={role} className={`text-xs cursor-pointer ${ROLE_COLORS[role]}`} onClick={() => canManageRole(role) ? handleRemoveRole(u.user_id, role) : null} title={canManageRole(role) ? "Cliquer pour retirer" : ""}>
                              {role === "super_admin" && <Crown className="w-3 h-3 mr-1" />}
                              {role === "admin" && <Shield className="w-3 h-3 mr-1" />}
                              {getRoleLabel(role)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      {u.user_id !== user?.id && getAvailableRoles().length > 0 && (
                        <Select onValueChange={(role) => handleAssignRole(u.user_id, role as AppRole)}>
                          <SelectTrigger className="w-44 h-8 text-xs">
                            <SelectValue placeholder="Attribuer un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableRoles()
                              .filter(r => !u.roles.includes(r))
                              .map(role => (
                                <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
