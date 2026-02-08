import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Image,
  Palette,
  Calendar,
  TrendingUp,
  Upload,
  Settings,
  ChevronRight,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalImages: number;
  totalUsers: number;
  totalDesigners: number;
  totalTemplates: number;
  imagesThisMonth: number;
  usersThisMonth: number;
  totalFeedbacks: number;
  averageRating: number;
}

interface RecentImage {
  id: string;
  prompt: string;
  created_at: string;
  domain: string | null;
  image_url: string;
  is_showcase: boolean | null;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  created_at: string;
  company_name: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = useAdmin();

  const [stats, setStats] = useState<DashboardStats>({
    totalImages: 0,
    totalUsers: 0,
    totalDesigners: 0,
    totalTemplates: 0,
    imagesThisMonth: 0,
    usersThisMonth: 0,
    totalFeedbacks: 0,
    averageRating: 0,
  });
  const [recentImages, setRecentImages] = useState<RecentImage[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        feedbackResult,
      ] = await Promise.all([
        supabase.from("generated_images").select("id", { count: "exact", head: true }),
        supabase.from("generated_images").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("partner_designers").select("id", { count: "exact", head: true }),
        supabase.from("reference_templates").select("id", { count: "exact", head: true }),
        supabase.from("generated_images").select("id, prompt, created_at, domain, image_url, is_showcase").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("id, full_name, created_at, company_name").order("created_at", { ascending: false }).limit(10),
        supabase.from("generation_feedback").select("rating"),
      ]);

      const ratings = feedbackResult.data || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

      setStats({
        totalImages: imagesResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalDesigners: designersResult.count || 0,
        totalTemplates: templatesResult.count || 0,
        imagesThisMonth: imagesMonthResult.count || 0,
        usersThisMonth: usersMonthResult.count || 0,
        totalFeedbacks: ratings.length,
        averageRating: Math.round(avgRating * 10) / 10,
      });

      setRecentImages(recentImagesResult.data || []);
      setRecentUsers(recentUsersResult.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  const toggleShowcase = async (imageId: string, currentValue: boolean | null) => {
    try {
      const { error } = await supabase
        .from("generated_images")
        .update({ is_showcase: !currentValue })
        .eq("id", imageId);

      if (error) throw error;
      toast.success(currentValue ? "Retiré du showcase" : "Ajouté au showcase");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <AdminLayout requiredPermission="view_dashboard">
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
        <Card className="bg-card/60 border-border/40 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/showcase")}>
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

        <Card className="bg-card/60 border-border/40 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/subscriptions")}>
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

        <Card className="bg-card/60 border-border/40 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/designers")}>
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

        <Card className="bg-card/60 border-border/40 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/feedback")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Feedbacks
            </CardTitle>
            <Star className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalFeedbacks}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              {stats.averageRating}/5 note moyenne
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {hasPermission("manage_templates") && (
        <Card className="bg-card/60 border-border/40 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/admin/templates")} className="bg-gradient-to-r from-primary to-accent">
              <Upload className="w-4 h-4 mr-2" />
              Ajouter un template
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/marquee")}>
              <Palette className="w-4 h-4 mr-2" />
              Gérer le marquee
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/showcase")}>
              <Eye className="w-4 h-4 mr-2" />
              Gérer le showcase
            </Button>
            {hasPermission("manage_users") && (
              <Button variant="outline" onClick={() => navigate("/admin/subscriptions")}>
                <Settings className="w-4 h-4 mr-2" />
                Gérer les abonnements
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
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/showcase")}>
                Tout voir <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aperçu</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentImages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Aucune affiche créée
                    </TableCell>
                  </TableRow>
                ) : (
                  recentImages.slice(0, 5).map((image) => (
                    <TableRow key={image.id}>
                      <TableCell>
                        <img
                          src={image.image_url}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm">
                        {image.prompt}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {image.domain || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleShowcase(image.id, image.is_showcase)}
                          title={image.is_showcase ? "Retirer du showcase" : "Ajouter au showcase"}
                        >
                          {image.is_showcase ? (
                            <Eye className="w-4 h-4 text-primary" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
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
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/subscriptions")}>
                Tout voir <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Aucun utilisateur inscrit
                    </TableCell>
                  </TableRow>
                ) : (
                  recentUsers.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.full_name || "Sans nom"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {profile.company_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
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
    </AdminLayout>
  );
}
