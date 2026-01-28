import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Trash2, Star, Image, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";

interface ShowcaseImage {
  id: string;
  image_url: string;
  prompt: string;
  domain: string | null;
  created_at: string;
  is_showcase: boolean;
  is_downloaded: boolean | null;
  user_rating: number | null;
}

export default function AdminShowcase() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [images, setImages] = useState<ShowcaseImage[]>([]);
  const [allImages, setAllImages] = useState<ShowcaseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"showcase" | "all">("showcase");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      fetchImages();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchImages = async () => {
    try {
      // Fetch showcase images
      const { data: showcaseData, error: showcaseError } = await supabase
        .from("generated_images")
        .select("id, image_url, prompt, domain, created_at, is_showcase, is_downloaded, user_rating")
        .eq("is_showcase", true)
        .order("created_at", { ascending: false });

      if (showcaseError) throw showcaseError;
      setImages(showcaseData || []);

      // Fetch all recent images (for adding to showcase)
      const { data: allData, error: allError } = await supabase
        .from("generated_images")
        .select("id, image_url, prompt, domain, created_at, is_showcase, is_downloaded, user_rating")
        .order("created_at", { ascending: false })
        .limit(100);

      if (allError) throw allError;
      setAllImages(allData || []);
    } catch (err) {
      console.error("Error fetching images:", err);
      toast.error("Erreur lors du chargement des images");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShowcase = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("generated_images")
        .update({ is_showcase: !currentState })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setImages(prev => 
        currentState 
          ? prev.filter(img => img.id !== id)
          : prev
      );
      setAllImages(prev => 
        prev.map(img => img.id === id ? { ...img, is_showcase: !currentState } : img)
      );

      if (!currentState) {
        const addedImage = allImages.find(img => img.id === id);
        if (addedImage) {
          setImages(prev => [{ ...addedImage, is_showcase: true }, ...prev]);
        }
      }

      toast.success(currentState ? "Retiré du showcase" : "Ajouté au showcase");
    } catch (err) {
      console.error("Error toggling showcase:", err);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette image définitivement ?")) return;

    try {
      const { error } = await supabase
        .from("generated_images")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== id));
      setAllImages(prev => prev.filter(img => img.id !== id));
      toast.success("Image supprimée");
    } catch (err) {
      console.error("Error deleting image:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getDomainLabel = (domain: string | null) => {
    const labels: Record<string, string> = {
      church: "Église",
      restaurant: "Restaurant",
      event: "Événement",
      formation: "Formation",
      ecommerce: "E-commerce",
      service: "Service",
      fashion: "Mode",
      youtube: "YouTube",
      technology: "Tech",
      education: "Éducation",
    };
    return domain ? labels[domain] || domain : "Général";
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayedImages = activeTab === "showcase" ? images : allImages;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gestion du Showcase</h1>
              <p className="text-muted-foreground">Gérez les créations affichées dans la vitrine publique</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchImages} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{images.length}</div>
              <p className="text-sm text-muted-foreground">Dans le showcase</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{allImages.filter(i => i.is_downloaded).length}</div>
              <p className="text-sm text-muted-foreground">Téléchargées</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-500">
                {allImages.filter(i => i.user_rating && i.user_rating >= 4).length}
              </div>
              <p className="text-sm text-muted-foreground">Bien notées (4+)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{allImages.length}</div>
              <p className="text-sm text-muted-foreground">Total récent</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "showcase" ? "default" : "outline"}
            onClick={() => setActiveTab("showcase")}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Showcase actuel ({images.length})
          </Button>
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
            className="gap-2"
          >
            <Image className="h-4 w-4" />
            Toutes les créations ({allImages.length})
          </Button>
        </div>

        {/* Images Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayedImages.map((image) => (
            <div
              key={image.id}
              className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                image.is_showcase
                  ? "border-primary/40 ring-2 ring-primary/20"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <div className="aspect-[3/4]">
                <img
                  src={image.image_url}
                  alt={image.prompt?.slice(0, 50) || "Création"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {getDomainLabel(image.domain)}
                </Badge>
                {image.user_rating && (
                  <Badge variant="outline" className="text-xs bg-background/80 gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    {image.user_rating}
                  </Badge>
                )}
              </div>

              {/* Showcase badge */}
              {image.is_showcase && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Visible
                  </Badge>
                </div>
              )}

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                  <p className="text-xs text-foreground line-clamp-2">
                    {image.prompt?.slice(0, 80)}...
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={image.is_showcase ? "outline" : "default"}
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleToggleShowcase(image.id, image.is_showcase)}
                    >
                      {image.is_showcase ? (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Retirer
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Ajouter
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(image.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayedImages.length === 0 && (
          <div className="text-center py-16">
            <Image className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {activeTab === "showcase" 
                ? "Aucune image dans le showcase" 
                : "Aucune création récente"
              }
            </h3>
            <p className="text-sm text-muted-foreground/70">
              {activeTab === "showcase"
                ? "Allez dans 'Toutes les créations' pour ajouter des images"
                : "Les créations des utilisateurs apparaîtront ici"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
