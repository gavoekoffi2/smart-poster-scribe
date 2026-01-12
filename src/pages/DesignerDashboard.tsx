import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Image, 
  DollarSign, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  TrendingUp,
  User,
  ExternalLink,
  Clock
} from "lucide-react";

interface DesignerProfile {
  id: string;
  display_name: string;
  bio: string | null;
  portfolio_url: string | null;
  is_verified: boolean;
  templates_count: number;
  total_earnings: number;
  created_at: string;
}

interface Template {
  id: string;
  image_url: string;
  domain: string;
  design_category: string;
  description: string | null;
  is_active: boolean;
  earnings: number;
  usage_count: number;
  created_at: string;
}

const DesignerDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<DesignerProfile | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDesignerData();
    }
  }, [user]);

  const fetchDesignerData = async () => {
    if (!user) return;
    
    try {
      // Fetch designer profile
      const { data: designerData, error: designerError } = await supabase
        .from("partner_designers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (designerError) {
        if (designerError.code === "PGRST116") {
          // Not registered as designer
          navigate("/designer/register");
          return;
        }
        throw designerError;
      }

      setProfile(designerData);

      // Fetch designer's templates
      const { data: templatesData, error: templatesError } = await supabase
        .from("reference_templates")
        .select("*")
        .eq("designer_id", designerData.id)
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

    } catch (error: any) {
      console.error("Error fetching designer data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateVisibility = async (templateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("reference_templates")
        .update({ is_active: !currentStatus })
        .eq("id", templateId);

      if (error) throw error;

      setTemplates(templates.map(t => 
        t.id === templateId ? { ...t, is_active: !currentStatus } : t
      ));
      
      toast.success(currentStatus ? "Template désactivé" : "Template activé");
    } catch (error: any) {
      console.error("Error toggling template:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) return;

    try {
      const { error } = await supabase
        .from("reference_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success("Template supprimé");
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (!profile) {
    return null;
  }

  const activeTemplates = templates.filter(t => t.is_active).length;
  const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {profile.display_name}
                {profile.is_verified ? (
                  <Badge className="bg-green-500">Vérifié</Badge>
                ) : (
                  <Badge variant="secondary">En attente</Badge>
                )}
              </h1>
              <p className="text-muted-foreground">Tableau de bord graphiste</p>
            </div>
          </div>
          <Button onClick={() => navigate("/designer/upload")}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un template
          </Button>
        </div>

        {!profile.is_verified && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <p className="text-sm">
                  Votre profil est en attente de validation par un administrateur. 
                  Vous pourrez ajouter des templates une fois validé.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Templates</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeTemplates} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gains Totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profile.total_earnings?.toFixed(2) || "0.00"} €
              </div>
              <p className="text-xs text-muted-foreground">
                Royalties cumulées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Utilisations</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsage}</div>
              <p className="text-xs text-muted-foreground">
                Fois utilisés par l'IA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Profil</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate("/designer/profile")}
              >
                Voir mon profil
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Templates Section */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Tous ({templates.length})</TabsTrigger>
            <TabsTrigger value="active">Actifs ({activeTemplates})</TabsTrigger>
            <TabsTrigger value="inactive">Inactifs ({templates.length - activeTemplates})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <TemplateGrid 
              templates={templates} 
              onToggle={toggleTemplateVisibility}
              onDelete={deleteTemplate}
            />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <TemplateGrid 
              templates={templates.filter(t => t.is_active)} 
              onToggle={toggleTemplateVisibility}
              onDelete={deleteTemplate}
            />
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            <TemplateGrid 
              templates={templates.filter(t => !t.is_active)} 
              onToggle={toggleTemplateVisibility}
              onDelete={deleteTemplate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface TemplateGridProps {
  templates: Template[];
  onToggle: (id: string, status: boolean) => void;
  onDelete: (id: string) => void;
}

const TemplateGrid = ({ templates, onToggle, onDelete }: TemplateGridProps) => {
  if (templates.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center text-muted-foreground">
          <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun template dans cette catégorie</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className={!template.is_active ? "opacity-60" : ""}>
          <div className="aspect-[4/3] relative overflow-hidden rounded-t-lg">
            <img
              src={template.image_url}
              alt={template.description || "Template"}
              className="object-cover w-full h-full"
            />
            <Badge 
              className="absolute top-2 right-2"
              variant={template.is_active ? "default" : "secondary"}
            >
              {template.is_active ? "Actif" : "Inactif"}
            </Badge>
          </div>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="font-medium line-clamp-1">{template.description || "Sans description"}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{template.domain}</Badge>
                <Badge variant="outline">{template.design_category}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {template.usage_count || 0} utilisations
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                {template.earnings?.toFixed(2) || "0.00"} €
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onToggle(template.id, template.is_active)}
              >
                {template.is_active ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Désactiver
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Activer
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(template.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DesignerDashboard;
