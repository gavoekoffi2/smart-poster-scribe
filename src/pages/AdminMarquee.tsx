import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, GripVertical, Image, Video, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";

interface MarqueeItem {
  id: string;
  image_url: string;
  title: string | null;
  domain: string;
  item_type: string;
  row_number: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const DOMAINS = [
  { value: "youtube", label: "YouTube" },
  { value: "church", label: "Église" },
  { value: "restaurant", label: "Restaurant" },
  { value: "event", label: "Événement" },
  { value: "formation", label: "Formation" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "service", label: "Service" },
  { value: "fashion", label: "Mode" },
];

export default function AdminMarquee() {
  const navigate = useNavigate();
  const { isAdmin, hasPermission, isLoading: adminLoading } = useAdmin();
  const [items, setItems] = useState<MarqueeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"youtube" | "poster">("youtube");
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [newItem, setNewItem] = useState({
    image_url: "",
    title: "",
    domain: "youtube",
    item_type: "youtube" as "youtube" | "poster",
    row_number: 1,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      fetchItems();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("marquee_items")
        .select("*")
        .order("item_type")
        .order("row_number")
        .order("sort_order");
      
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching marquee items:", err);
      toast.error("Erreur lors du chargement des éléments");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.image_url) {
      toast.error("L'URL de l'image est requise");
      return;
    }

    try {
      const maxOrder = items
        .filter(i => i.item_type === newItem.item_type && i.row_number === newItem.row_number)
        .reduce((max, i) => Math.max(max, i.sort_order), 0);

      const { error } = await supabase
        .from("marquee_items")
        .insert({
          image_url: newItem.image_url,
          title: newItem.title || null,
          domain: newItem.domain,
          item_type: newItem.item_type,
          row_number: newItem.row_number,
          sort_order: maxOrder + 1,
          is_active: true,
        });

      if (error) throw error;

      toast.success("Élément ajouté avec succès");
      setShowAddForm(false);
      setNewItem({ image_url: "", title: "", domain: "youtube", item_type: "youtube", row_number: 1 });
      fetchItems();
    } catch (err) {
      console.error("Error adding item:", err);
      toast.error("Erreur lors de l'ajout de l'élément");
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("marquee_items")
        .update({ is_active: !currentState, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setItems(items.map(item => 
        item.id === id ? { ...item, is_active: !currentState } : item
      ));
      toast.success(currentState ? "Élément désactivé" : "Élément activé");
    } catch (err) {
      console.error("Error toggling item:", err);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;

    try {
      const { error } = await supabase
        .from("marquee_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setItems(items.filter(item => item.id !== id));
      toast.success("Élément supprimé");
    } catch (err) {
      console.error("Error deleting item:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `marquee-${Date.now()}.${fileExt}`;
      const filePath = `marquee/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("reference-templates")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("reference-templates")
        .getPublicUrl(filePath);

      setNewItem({ ...newItem, image_url: publicUrl });
      toast.success("Image uploadée avec succès");
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleMoveItem = async (id: string, direction: "up" | "down") => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const sameGroupItems = items
      .filter(i => i.item_type === item.item_type && i.row_number === item.row_number)
      .sort((a, b) => a.sort_order - b.sort_order);

    const currentIndex = sameGroupItems.findIndex(i => i.id === id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sameGroupItems.length) return;

    const targetItem = sameGroupItems[targetIndex];

    try {
      await supabase
        .from("marquee_items")
        .update({ sort_order: targetItem.sort_order })
        .eq("id", item.id);

      await supabase
        .from("marquee_items")
        .update({ sort_order: item.sort_order })
        .eq("id", targetItem.id);

      fetchItems();
    } catch (err) {
      console.error("Error moving item:", err);
      toast.error("Erreur lors du déplacement");
    }
  };

  const filteredItems = items.filter(item => item.item_type === activeTab);
  const groupedItems = {
    row1: filteredItems.filter(i => i.row_number === 1).sort((a, b) => a.sort_order - b.sort_order),
    row2: filteredItems.filter(i => i.row_number === 2).sort((a, b) => a.sort_order - b.sort_order),
    row3: filteredItems.filter(i => i.row_number === 3).sort((a, b) => a.sort_order - b.sort_order),
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold">Gestion du Marquee</h1>
              <p className="text-muted-foreground">Gérez les visuels affichés sur la page d'accueil</p>
            </div>
          </div>
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un visuel
          </Button>
        </div>

        {/* Add Form Modal */}
        {showAddForm && (
          <Card className="mb-8 border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Nouveau visuel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newItem.item_type}
                    onValueChange={(value: "youtube" | "poster") => 
                      setNewItem({ ...newItem, item_type: value, domain: value === "youtube" ? "youtube" : "event" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-red-500" />
                          Miniature YouTube
                        </div>
                      </SelectItem>
                      <SelectItem value="poster">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4 text-primary" />
                          Affiche
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Domaine</Label>
                  <Select
                    value={newItem.domain}
                    onValueChange={(value) => setNewItem({ ...newItem, domain: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAINS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newItem.item_type === "poster" && (
                  <div className="space-y-2">
                    <Label>Rangée</Label>
                    <Select
                      value={newItem.row_number.toString()}
                      onValueChange={(value) => setNewItem({ ...newItem, row_number: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Rangée 1</SelectItem>
                        <SelectItem value="2">Rangée 2</SelectItem>
                        <SelectItem value="3">Rangée 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Titre (optionnel)</Label>
                  <Input
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Titre descriptif"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex gap-2">
                  <Input
                    value={newItem.image_url}
                    onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                    placeholder="URL de l'image ou uploader ci-dessous"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" disabled={uploading} asChild>
                      <span className="gap-2">
                        <Upload className="h-4 w-4" />
                        {uploading ? "..." : "Upload"}
                      </span>
                    </Button>
                  </label>
                </div>
                {newItem.image_url && (
                  <div className="mt-2">
                    <img 
                      src={newItem.image_url} 
                      alt="Preview" 
                      className="h-24 w-auto rounded-lg object-cover border"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddItem}>
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "youtube" | "poster")}>
          <TabsList className="mb-6">
            <TabsTrigger value="youtube" className="gap-2">
              <Video className="h-4 w-4" />
              Miniatures YouTube ({items.filter(i => i.item_type === "youtube").length})
            </TabsTrigger>
            <TabsTrigger value="poster" className="gap-2">
              <Image className="h-4 w-4" />
              Affiches ({items.filter(i => i.item_type === "poster").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <Card>
              <CardHeader>
                <CardTitle>Miniatures YouTube</CardTitle>
              </CardHeader>
              <CardContent>
                <ItemsGrid 
                  items={groupedItems.row1} 
                  onToggle={handleToggleActive}
                  onDelete={handleDeleteItem}
                  onMove={handleMoveItem}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="poster" className="space-y-6">
            {[1, 2, 3].map(row => (
              <Card key={row}>
                <CardHeader>
                  <CardTitle>Rangée {row}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ItemsGrid 
                    items={groupedItems[`row${row}` as keyof typeof groupedItems]}
                    onToggle={handleToggleActive}
                    onDelete={handleDeleteItem}
                    onMove={handleMoveItem}
                  />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ItemsGrid({ 
  items, 
  onToggle, 
  onDelete,
  onMove 
}: { 
  items: MarqueeItem[];
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>Aucun élément dans cette section</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item, index) => (
        <div 
          key={item.id}
          className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
            item.is_active 
              ? "border-primary/30 hover:border-primary/60" 
              : "border-border/50 opacity-50"
          }`}
        >
          <div className={item.item_type === "youtube" ? "aspect-video" : "aspect-[3/4]"}>
            <img
              src={item.image_url}
              alt={item.title || "Marquee item"}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-7 w-7"
                    onClick={() => onMove(item.id, "up")}
                    disabled={index === 0}
                  >
                    <GripVertical className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant={item.is_active ? "secondary" : "outline"}
                    className="h-7 w-7"
                    onClick={() => onToggle(item.id, item.is_active)}
                  >
                    {item.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="h-7 w-7"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {item.title && (
                <p className="text-xs text-foreground truncate">{item.title}</p>
              )}
            </div>
          </div>

          {/* Status badge */}
          {!item.is_active && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">
              Masqué
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
