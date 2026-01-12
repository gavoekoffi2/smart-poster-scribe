import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin, AppRole } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  Users,
  Image,
  Palette,
  LogOut,
  ChevronRight,
  Loader2,
  Shield,
  Calendar,
  TrendingUp,
  Upload,
  Settings,
  Crown,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  totalImages: number;
  totalUsers: number;
  totalDesigners: number;
  totalTemplates: number;
  imagesThisMonth: number;
  usersThisMonth: number;
}

interface RecentImage {
  id: string;
  prompt: string;
  created_at: string;
  domain: string | null;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  created_at: string;
}

type AdminSection = 'dashboard' | 'images' | 'users' | 'designers' | 'templates' | 'roles';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { userRole, isLoading: roleLoading, hasPermission, getRoleLabel, isSuperAdmin, isAdmin } = useAdmin();
  
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalImages: 0,
    totalUsers: 0,
    totalDesigners: 0,
    totalTemplates: 0,
    imagesThisMonth: 0,
    usersThisMonth: 0,
  });
  const [recentImages, setRecentImages] = useState<RecentImage[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth", { state: { redirectTo: "/admin/dashboard" } });
        return;
      }
      
      if (!userRole || !hasPermission('view_dashboard')) {
        toast.error("Accès refusé - Vous n'avez pas les permissions nécessaires");
        navigate("/");
        return;
      }
      
      fetchDashboardData();
    }
  }, [user, authLoading, roleLoading, userRole, navigate, hasPermission]);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        imagesResult,
        imagesMonthResult,
        usersResult,
        usersMonthResult,
        designersResult,
        templatesResult,
        recentImagesResult,
        recentUsersResult,
      ] = await Promise.all([
        supabase.from("generated_images").select("id", { count: "exact", head: true }),
        supabase.from("generated_images").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("partner_designers").select("id", { count: "exact", head: true }),
        supabase.from("reference_templates").select("id", { count: "exact", head: true }),
        supabase.from("generated_images").select("id, prompt, created_at, domain").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      setStats({
        totalImages: imagesResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalDesigners: designersResult.count || 0,
        totalTemplates: templatesResult.count || 0,
        imagesThisMonth: imagesMonthResult.count || 0,
        usersThisMonth: usersMonthResult.count || 0,
      });

      setRecentImages(recentImagesResult.data || []);
      setRecentUsers(recentUsersResult.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole || !hasPermission('view_dashboard')) {
    return null;
  }

  const getRoleIcon = () => {
    if (isSuperAdmin) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (isAdmin) return <Shield className="w-4 h-4 text-primary" />;
    return <UserCog className="w-4 h-4 text-muted-foreground" />;
  };

  const navItems = [
    { id: 'dashboard' as const, label: "Vue d'ensemble", icon: LayoutDashboard, permission: 'view_dashboard' },
    { id: 'templates' as const, label: "Templates", icon: Image, permission: 'manage_templates' },
    { id: 'images' as const, label: "Affiches", icon: Palette, permission: 'view_dashboard' },
    { id: 'users' as const, label: "Utilisateurs", icon: Users, permission: 'manage_users' },
    { id: 'designers' as const, label: "Graphistes", icon: Palette, permission: 'manage_designers' },
    { id: 'roles' as const, label: "Rôles", icon: Shield, permission: 'manage_admins' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            {getRoleIcon()}
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">Admin</h1>
            <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)}</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {navItems.map(item => {
            if (!hasPermission(item.permission)) return null;
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => {
                  if (item.id === 'templates') {
                    navigate("/admin/templates");
                  } else {
                    setActiveSection(item.id);
                  }
                }}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="space-y-2 pt-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ChevronRight className="w-4 h-4" />
            Retour au site
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-foreground">
            Tableau de bord
          </h2>
          <p className="text-muted-foreground">
            Bienvenue, voici un aperçu de votre plateforme
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Affiches créées
              </CardTitle>
              <Image className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalImages}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                +{stats.imagesThisMonth} ce mois
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilisateurs
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                +{stats.usersThisMonth} ce mois
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Graphistes partenaires
              </CardTitle>
              <Palette className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalDesigners}</div>
              <p className="text-xs text-muted-foreground">inscrits sur la plateforme</p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Templates
              </CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalTemplates}</div>
              <p className="text-xs text-muted-foreground">disponibles</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {hasPermission('manage_templates') && (
          <Card className="bg-card/60 border-border/40 mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button 
                onClick={() => navigate("/admin/templates")}
                className="bg-gradient-to-r from-primary to-accent"
              >
                <Upload className="w-4 h-4 mr-2" />
                Ajouter un template
              </Button>
              {hasPermission('manage_settings') && (
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Images */}
          <Card className="bg-card/60 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground flex items-center justify-between">
                Affiches récentes
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Domaine</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentImages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Aucune affiche créée
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentImages.map((image) => (
                      <TableRow key={image.id}>
                        <TableCell className="max-w-[200px] truncate">
                          {image.prompt}
                        </TableCell>
                        <TableCell className="capitalize">
                          {image.domain || "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(image.created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card className="bg-card/60 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground flex items-center justify-between">
                Utilisateurs récents
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Aucun utilisateur inscrit
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentUsers.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>{profile.full_name || "Sans nom"}</TableCell>
                        <TableCell>
                          {new Date(profile.created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
