import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, GripVertical, Image, Video, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

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
  const [items, setItems] = useState<MarqueeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"youtube" | "poster">("youtube");
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({ image_url: "", title: "", domain: "youtube", item_type: "youtube" as "youtube" | "poster", row_number: 1 });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase.from("marquee_items").select("*").order("item_type").order("row_number").order("sort_order");
      if (error) throw error;
      setItems(data || []);
    } catch { toast.error("Erreur chargement"); } finally { setLoading(false); }
  };

  const handleAddItem = async () => {
    if (!newItem.image_url) { toast.error("URL image requise"); return; }
    try {
      const maxOrder = items.filter(i => i.item_type === newItem.item_type && i.row_number === newItem.row_number).reduce((max, i) => Math.max(max, i.sort_order), 0);
      const { error } = await supabase.from("marquee_items").insert({ image_url: newItem.image_url, title: newItem.title || null, domain: newItem.domain, item_type: newItem.item_type, row_number: newItem.row_number, sort_order: maxOrder + 1, is_active: true });
      if (error) throw error;
      toast.success("Ajouté");
      setShowAddForm(false);
      setNewItem({ image_url: "", title: "", domain: "youtube", item_type: "youtube", row_number: 1 });
      fetchItems();
    } catch { toast.error("Erreur ajout"); }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from("marquee_items").update({ is_active: !current, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      setItems(items.map(i => i.id === id ? { ...i, is_active: !current } : i));
      toast.success(current ? "Désactivé" : "Activé");
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    try {
      const { error } = await supabase.from("marquee_items").delete().eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Supprimé");
    } catch { toast.error("Erreur"); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `marquee/marquee-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from("reference-templates").upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("reference-templates").getPublicUrl(fileName);
      setNewItem({ ...newItem, image_url: publicUrl });
      toast.success("Image uploadée");
    } catch { toast.error("Erreur upload"); } finally { setUploading(false); }
  };

  const handleMoveItem = async (id: string, direction: "up" | "down") => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const group = items.filter(i => i.item_type === item.item_type && i.row_number === item.row_number).sort((a, b) => a.sort_order - b.sort_order);
    const idx = group.findIndex(i => i.id === id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= group.length) return;
    const target = group[targetIdx];
    try {
      await supabase.from("marquee_items").update({ sort_order: target.sort_order }).eq("id", item.id);
      await supabase.from("marquee_items").update({ sort_order: item.sort_order }).eq("id", target.id);
      fetchItems();
    } catch { toast.error("Erreur"); }
  };

  const filteredItems = items.filter(i => i.item_type === activeTab);
  const groupedItems = {
    row1: filteredItems.filter(i => i.row_number === 1).sort((a, b) => a.sort_order - b.sort_order),
    row2: filteredItems.filter(i => i.row_number === 2).sort((a, b) => a.sort_order - b.sort_order),
    row3: filteredItems.filter(i => i.row_number === 3).sort((a, b) => a.sort_order - b.sort_order),
  };

  return (
    <AdminLayout requiredPermission="manage_templates">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Gestion du Marquee</h2>
          <p className="text-muted-foreground">Gérez les visuels de la page d'accueil</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2"><Plus className="h-4 w-4" />Ajouter</Button>
      </div>

      {showAddForm && (
        <Card className="mb-8 border-primary/50 bg-card/60">
          <CardHeader><CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" />Nouveau visuel</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newItem.item_type} onValueChange={(v: "youtube" | "poster") => setNewItem({ ...newItem, item_type: v, domain: v === "youtube" ? "youtube" : "event" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube"><div className="flex items-center gap-2"><Video className="h-4 w-4 text-red-500" />YouTube</div></SelectItem>
                    <SelectItem value="poster"><div className="flex items-center gap-2"><Image className="h-4 w-4 text-primary" />Affiche</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Domaine</Label>
                <Select value={newItem.domain} onValueChange={(v) => setNewItem({ ...newItem, domain: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOMAINS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {newItem.item_type === "poster" && (
                <div className="space-y-2">
                  <Label>Rangée</Label>
                  <Select value={newItem.row_number.toString()} onValueChange={(v) => setNewItem({ ...newItem, row_number: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Rangée 1</SelectItem><SelectItem value="2">Rangée 2</SelectItem><SelectItem value="3">Rangée 3</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2"><Label>Titre (optionnel)</Label><Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} placeholder="Titre" /></div>
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex gap-2">
                <Input value={newItem.image_url} onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })} placeholder="URL ou uploader" />
                <label className="cursor-pointer"><input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" /><Button type="button" variant="outline" disabled={uploading} asChild><span className="gap-2"><Upload className="h-4 w-4" />{uploading ? "..." : "Upload"}</span></Button></label>
              </div>
              {newItem.image_url && <img src={newItem.image_url} alt="Preview" className="h-24 w-auto rounded-lg object-cover border mt-2" />}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAddItem}>Ajouter</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "youtube" | "poster")}>
        <TabsList className="mb-6">
          <TabsTrigger value="youtube" className="gap-2"><Video className="h-4 w-4" />YouTube ({items.filter(i => i.item_type === "youtube").length})</TabsTrigger>
          <TabsTrigger value="poster" className="gap-2"><Image className="h-4 w-4" />Affiches ({items.filter(i => i.item_type === "poster").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="youtube">
          <Card className="bg-card/60 border-border/40"><CardHeader><CardTitle>Miniatures YouTube</CardTitle></CardHeader><CardContent>
            <ItemsGrid items={groupedItems.row1} onToggle={handleToggleActive} onDelete={handleDeleteItem} onMove={handleMoveItem} />
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="poster" className="space-y-6">
          {[1, 2, 3].map(row => (
            <Card key={row} className="bg-card/60 border-border/40"><CardHeader><CardTitle>Rangée {row}</CardTitle></CardHeader><CardContent>
              <ItemsGrid items={groupedItems[`row${row}` as keyof typeof groupedItems]} onToggle={handleToggleActive} onDelete={handleDeleteItem} onMove={handleMoveItem} />
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function ItemsGrid({ items, onToggle, onDelete, onMove }: { items: MarqueeItem[]; onToggle: (id: string, c: boolean) => void; onDelete: (id: string) => void; onMove: (id: string, d: "up" | "down") => void; }) {
  if (items.length === 0) return <div className="text-center py-8 text-muted-foreground"><Image className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>Aucun élément</p></div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item, index) => (
        <div key={item.id} className={`group relative rounded-xl overflow-hidden border-2 transition-all ${item.is_active ? "border-primary/30 hover:border-primary/60" : "border-border/50 opacity-50"}`}>
          <div className={item.item_type === "youtube" ? "aspect-video" : "aspect-[3/4]"}>
            <img src={item.image_url} alt={item.title || ""} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => onMove(item.id, "up")} disabled={index === 0}><GripVertical className="h-3 w-3" /></Button>
                  <Button size="icon" variant={item.is_active ? "secondary" : "outline"} className="h-7 w-7" onClick={() => onToggle(item.id, item.is_active)}>
                    {item.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </div>
                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => onDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
