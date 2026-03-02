import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, Loader2, Trash2, Image as ImageIcon, Check, X } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface Template {
  id: string;
  domain: string;
  design_category: string;
  image_url: string;
  description: string | null;
  tags: string[] | null;
  created_at: string;
}

const DOMAINS = [
  { id: "church", name: "Église" },
  { id: "restaurant", name: "Restaurant" },
  { id: "formation", name: "Formation" },
  { id: "ecommerce", name: "E-commerce" },
  { id: "event", name: "Événement" },
  { id: "service", name: "Service" },
  { id: "fashion", name: "Mode" },
  { id: "realestate", name: "Immobilier" },
  { id: "health", name: "Santé" },
];

export default function AdminTemplates() {
  const { user } = useAuth();
  const { hasPermission } = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({ domain: "", design_category: "", description: "", tags: "" });

  useEffect(() => { if (user) fetchTemplates(); }, [user]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.from("reference_templates").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Erreur lors du chargement des templates");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) { toast.error("Veuillez sélectionner une image"); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.domain || !formData.design_category) { toast.error("Veuillez remplir tous les champs obligatoires"); return; }
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${formData.domain}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("reference-templates").upload(fileName, selectedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("reference-templates").getPublicUrl(fileName);
      const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
      const { error: insertError } = await supabase.from("reference_templates").insert({
        domain: formData.domain, design_category: formData.design_category,
        image_url: publicUrl, description: formData.description || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
      });
      if (insertError) throw insertError;
      toast.success("Template ajouté avec succès");
      setSelectedFile(null); setPreviewUrl(null);
      setFormData({ domain: "", design_category: "", description: "", tags: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchTemplates();
    } catch (error) {
      console.error("Error uploading template:", error);
      toast.error("Erreur lors de l'upload du template");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (template: Template) => {
    if (!hasPermission('delete_templates')) { toast.error("Permission refusée"); return; }
    if (!confirm("Supprimer ce template ?")) return;
    try {
      const { error } = await supabase.from("reference_templates").delete().eq("id", template.id);
      if (error) throw error;
      try {
        const url = new URL(template.image_url);
        const storagePath = url.pathname.split('/').slice(-2).join('/');
        await supabase.storage.from("reference-templates").remove([storagePath]);
      } catch {}
      toast.success("Template supprimé");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <AdminLayout requiredPermission="manage_templates">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground">Gestion des Templates</h2>
        <p className="text-muted-foreground">Ajouter et gérer les templates de référence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <Card className="bg-card/60 border-border/40 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />Ajouter un template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Image *</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="py-8"><ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Cliquez pour sélectionner</p></div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
            <div>
              <Label>Domaine *</Label>
              <Select value={formData.domain} onValueChange={(v) => setFormData(p => ({ ...p, domain: v }))}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{DOMAINS.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Input value={formData.design_category} onChange={(e) => setFormData(p => ({ ...p, design_category: e.target.value }))} placeholder="ex: flyer, affiche..." className="mt-2" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Description..." className="mt-2" rows={3} />
            </div>
            <div>
              <Label>Tags (virgules)</Label>
              <Input value={formData.tags} onChange={(e) => setFormData(p => ({ ...p, tags: e.target.value }))} placeholder="église, prière..." className="mt-2" />
            </div>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !formData.domain || !formData.design_category} className="w-full bg-gradient-to-r from-primary to-accent">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Upload...</> : <><Check className="w-4 h-4 mr-2" />Ajouter</>}
            </Button>
          </CardContent>
        </Card>

        {/* Templates List */}
        <Card className="bg-card/60 border-border/40 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Templates existants ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Aucun template trouvé</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead>Domaine</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell><img src={t.image_url.startsWith('http') ? t.image_url : `/${t.image_url.replace(/^\//, '')}`} alt={t.design_category} className="w-16 h-16 object-cover rounded-lg" /></TableCell>
                      <TableCell className="capitalize">{DOMAINS.find(d => d.id === t.domain)?.name || t.domain}</TableCell>
                      <TableCell className="capitalize">{t.design_category.replace(/-/g, " ")}</TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        {hasPermission('delete_templates') && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(t)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
