import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  ExternalLink, 
  Image, 
  Calendar,
  CheckCircle,
  Palette
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
  user_id: string;
}

interface Template {
  id: string;
  image_url: string;
  domain: string;
  design_category: string;
  description: string | null;
  is_active: boolean;
}

const DesignerProfile = () => {
  const navigate = useNavigate();
  const { designerId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<DesignerProfile | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    display_name: "",
    bio: "",
    portfolio_url: "",
  });

  const isOwnProfile = user && profile && user.id === profile.user_id;

  useEffect(() => {
    fetchProfile();
  }, [designerId, user]);

  const fetchProfile = async () => {
    try {
      let query = supabase
        .from("partner_designers")
        .select("*");

      // If designerId provided, fetch that specific designer
      // Otherwise, fetch current user's profile
      if (designerId) {
        query = query.eq("id", designerId);
      } else if (user) {
        query = query.eq("user_id", user.id);
      } else {
        setLoading(false);
        return;
      }

      const { data: designerData, error: designerError } = await query.single();

      if (designerError) {
        if (designerError.code === "PGRST116") {
          if (!designerId) {
            navigate("/designer/register");
          } else {
            toast.error("Graphiste non trouvé");
            navigate("/");
          }
          return;
        }
        throw designerError;
      }

      setProfile(designerData);
      setEditData({
        display_name: designerData.display_name,
        bio: designerData.bio || "",
        portfolio_url: designerData.portfolio_url || "",
      });

      // Fetch public templates (only active ones for public view)
      const templateQuery = supabase
        .from("reference_templates")
        .select("id, image_url, domain, design_category, description, is_active")
        .eq("designer_id", designerData.id)
        .order("created_at", { ascending: false });

      // Show all templates for own profile, only active for public
      if (user?.id !== designerData.user_id) {
        templateQuery.eq("is_active", true);
      }

      const { data: templatesData, error: templatesError } = await templateQuery;
      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !isOwnProfile) return;

    try {
      const { error } = await supabase
        .from("partner_designers")
        .update({
          display_name: editData.display_name.trim(),
          bio: editData.bio.trim() || null,
          portfolio_url: editData.portfolio_url.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        display_name: editData.display_name.trim(),
        bio: editData.bio.trim() || null,
        portfolio_url: editData.portfolio_url.trim() || null,
      });
      setEditing(false);
      toast.success("Profil mis à jour !");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Profil non trouvé</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTemplates = templates.filter(t => t.is_active);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(isOwnProfile ? "/designer/dashboard" : "/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                  <Palette className="h-12 w-12 text-primary" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                {editing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nom d'affichage</Label>
                      <Input
                        value={editData.display_name}
                        onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Biographie</Label>
                      <Textarea
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Portfolio URL</Label>
                      <Input
                        type="url"
                        value={editData.portfolio_url}
                        onChange={(e) => setEditData({ ...editData, portfolio_url: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                      {profile.is_verified && (
                        <Badge className="bg-green-500 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Vérifié
                        </Badge>
                      )}
                    </div>

                    {profile.bio && (
                      <p className="text-muted-foreground">{profile.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Image className="h-4 w-4" />
                        {activeTemplates.length} templates
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Membre depuis {new Date(profile.created_at).toLocaleDateString("fr-FR", {
                          month: "long",
                          year: "numeric"
                        })}
                      </div>
                      {profile.portfolio_url && (
                        <a 
                          href={profile.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Portfolio
                        </a>
                      )}
                    </div>

                    {isOwnProfile && (
                      <Button variant="outline" onClick={() => setEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier le profil
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Créations {isOwnProfile ? `(${templates.length})` : `(${activeTemplates.length})`}
          </h2>
          
          {templates.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune création pour le moment</p>
                {isOwnProfile && (
                  <Button 
                    onClick={() => navigate("/designer/upload")}
                    className="mt-4"
                  >
                    Ajouter un template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className={!template.is_active && isOwnProfile ? "opacity-60" : ""}
                >
                  <div className="aspect-[4/3] relative overflow-hidden rounded-t-lg">
                    <img
                      src={template.image_url}
                      alt={template.description || "Template"}
                      className="object-cover w-full h-full"
                    />
                    {isOwnProfile && !template.is_active && (
                      <Badge 
                        variant="secondary"
                        className="absolute top-2 right-2"
                      >
                        Inactif
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm line-clamp-2 mb-2">
                      {template.description || "Sans description"}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{template.domain}</Badge>
                      <Badge variant="outline">{template.design_category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignerProfile;
