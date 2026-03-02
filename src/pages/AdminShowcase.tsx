import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, Trash2, Star, Image, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface ShowcaseImage {
  id: string;
  image_url: string;
  prompt: string;
  domain: string | null;
  created_at: string;
  is_showcase: boolean;
  is_downloaded: boolean | null;
  user_rating: number | null;
  showcase_order: number;
}

export default function AdminShowcase() {
  const [images, setImages] = useState<ShowcaseImage[]>([]);
  const [allImages, setAllImages] = useState<ShowcaseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"showcase" | "all">("showcase");

  useEffect(() => { fetchImages(); }, []);

  const fetchImages = async () => {
    try {
      const [showcaseRes, allRes] = await Promise.all([
        supabase.from("generated_images").select("id, image_url, prompt, domain, created_at, is_showcase, is_downloaded, user_rating, showcase_order").eq("is_showcase", true).order("showcase_order").order("created_at", { ascending: false }),
        supabase.from("generated_images").select("id, image_url, prompt, domain, created_at, is_showcase, is_downloaded, user_rating, showcase_order").order("created_at", { ascending: false }).limit(100),
      ]);
      if (showcaseRes.error) throw showcaseRes.error;
      if (allRes.error) throw allRes.error;
      setImages(showcaseRes.data || []);
      setAllImages(allRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShowcase = async (id: string, currentState: boolean) => {
    try {
      const newOrder = currentState ? 0 : images.length;
      const { error } = await supabase.from("generated_images").update({ is_showcase: !currentState, showcase_order: newOrder }).eq("id", id);
      if (error) throw error;
      setImages(prev => currentState ? prev.filter(img => img.id !== id) : prev);
      setAllImages(prev => prev.map(img => img.id === id ? { ...img, is_showcase: !currentState, showcase_order: newOrder } : img));
      if (!currentState) {
        const addedImage = allImages.find(img => img.id === id);
        if (addedImage) setImages(prev => [...prev, { ...addedImage, is_showcase: true, showcase_order: newOrder }]);
      }
      toast.success(currentState ? "Retiré du showcase" : "Ajouté au showcase");
    } catch (err) { toast.error("Erreur"); }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
    newImages[index].showcase_order = index;
    newImages[index - 1].showcase_order = index - 1;
    setImages(newImages);
    try {
      await Promise.all([
        supabase.from("generated_images").update({ showcase_order: index }).eq("id", newImages[index].id),
        supabase.from("generated_images").update({ showcase_order: index - 1 }).eq("id", newImages[index - 1].id),
      ]);
    } catch { fetchImages(); }
  };

  const handleMoveDown = async (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    newImages[index].showcase_order = index;
    newImages[index + 1].showcase_order = index + 1;
    setImages(newImages);
    try {
      await Promise.all([
        supabase.from("generated_images").update({ showcase_order: index }).eq("id", newImages[index].id),
        supabase.from("generated_images").update({ showcase_order: index + 1 }).eq("id", newImages[index + 1].id),
      ]);
    } catch { fetchImages(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette image ?")) return;
    try {
      const { error } = await supabase.from("generated_images").delete().eq("id", id);
      if (error) throw error;
      setImages(prev => prev.filter(img => img.id !== id));
      setAllImages(prev => prev.filter(img => img.id !== id));
      toast.success("Image supprimée");
    } catch { toast.error("Erreur"); }
  };

  const getDomainLabel = (d: string | null) => {
    const labels: Record<string, string> = { church: "Église", restaurant: "Restaurant", event: "Événement", formation: "Formation", ecommerce: "E-commerce", service: "Service", fashion: "Mode", youtube: "YouTube" };
    return d ? labels[d] || d : "Général";
  };

  if (loading) return <AdminLayout requiredPermission="manage_templates"><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></AdminLayout>;

  const displayedImages = activeTab === "showcase" ? images : allImages;

  return (
    <AdminLayout requiredPermission="manage_templates">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Gestion du Showcase</h2>
          <p className="text-muted-foreground">Gérez les créations de la vitrine publique</p>
        </div>
        <Button variant="outline" onClick={fetchImages} className="gap-2"><RefreshCw className="h-4 w-4" />Actualiser</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{images.length}</div><p className="text-sm text-muted-foreground">Dans le showcase</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{allImages.filter(i => i.is_downloaded).length}</div><p className="text-sm text-muted-foreground">Téléchargées</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{allImages.filter(i => i.user_rating && i.user_rating >= 4).length}</div><p className="text-sm text-muted-foreground">Bien notées (4+)</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{allImages.length}</div><p className="text-sm text-muted-foreground">Total récent</p></CardContent></Card>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === "showcase" ? "default" : "outline"} onClick={() => setActiveTab("showcase")} className="gap-2"><Eye className="h-4 w-4" />Showcase ({images.length})</Button>
        <Button variant={activeTab === "all" ? "default" : "outline"} onClick={() => setActiveTab("all")} className="gap-2"><Image className="h-4 w-4" />Toutes ({allImages.length})</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {displayedImages.map((image, index) => (
          <div key={image.id} className={`group relative rounded-xl overflow-hidden border-2 transition-all ${image.is_showcase ? "border-primary/40 ring-2 ring-primary/20" : "border-border/50 hover:border-border"}`}>
            <div className="aspect-[3/4]"><img src={image.image_url} alt="" className="w-full h-full object-cover" loading="lazy" /></div>
            {activeTab === "showcase" && <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{index + 1}</div>}
            <div className="absolute top-2 right-2 flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">{getDomainLabel(image.domain)}</Badge>
              {image.user_rating && <Badge variant="outline" className="text-xs bg-background/80 gap-1"><Star className="h-3 w-3 fill-primary text-primary" />{image.user_rating}</Badge>}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                <p className="text-xs text-foreground line-clamp-2">{image.prompt?.slice(0, 80)}...</p>
                {activeTab === "showcase" && (
                  <div className="flex gap-1 justify-center mb-2">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleMoveUp(index)} disabled={index === 0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleMoveDown(index)} disabled={index === images.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant={image.is_showcase ? "outline" : "default"} className="flex-1 h-8 text-xs" onClick={() => handleToggleShowcase(image.id, image.is_showcase)}>
                    {image.is_showcase ? <><EyeOff className="h-3 w-3 mr-1" />Retirer</> : <><Eye className="h-3 w-3 mr-1" />Ajouter</>}
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleDelete(image.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {displayedImages.length === 0 && (
        <div className="text-center py-16"><Image className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" /><h3 className="text-lg font-medium text-muted-foreground">{activeTab === "showcase" ? "Aucune image dans le showcase" : "Aucune création récente"}</h3></div>
      )}
    </AdminLayout>
  );
}
