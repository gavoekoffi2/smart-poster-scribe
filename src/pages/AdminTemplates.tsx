import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Upload,
  Loader2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Shield,
  Crown,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { userRole, isLoading: roleLoading, hasPermission, getRoleLabel, isSuperAdmin, isAdmin } = useAdmin();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    domain: "",
    design_category: "",
    description: "",
    tags: "",
  });

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth", { state: { redirectTo: "/admin/templates" } });
        return;
      }
      
      if (!userRole || !hasPermission('manage_templates')) {
        toast.error("Accès refusé - Vous n'avez pas les permissions nécessaires");
        navigate("/");
        return;
      }
      
      fetchTemplates();
    }
  }, [user, authLoading, roleLoading, userRole, navigate, hasPermission]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("reference_templates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

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
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.domain || !formData.design_category) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setUploading(true);
    try {
      // Upload image to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${formData.domain}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("reference-templates")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("reference-templates")
        .getPublicUrl(fileName);

      // Insert into database
      const tagsArray = formData.tags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error: insertError } = await supabase
        .from("reference_templates")
        .insert({
          domain: formData.domain,
          design_category: formData.design_category,
          image_url: publicUrl,
          description: formData.description || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
        });

      if (insertError) throw insertError;

      toast.success("Template ajouté avec succès");
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setFormData({
        domain: "",
        design_category: "",
        description: "",
        tags: "",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Refresh templates list
      fetchTemplates();
    } catch (error) {
      console.error("Error uploading template:", error);
      toast.error("Erreur lors de l'upload du template");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (template: Template) => {
    if (!hasPermission('delete_templates')) {
      toast.error("Vous n'avez pas la permission de supprimer les templates");
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) return;

    try {
      // Delete from database first
      const { error: deleteError } = await supabase
        .from("reference_templates")
        .delete()
        .eq("id", template.id);

      if (deleteError) throw deleteError;

      // Try to delete from storage (might fail if path format is different)
      try {
        const url = new URL(template.image_url);
        const pathParts = url.pathname.split('/');
        const storagePath = pathParts.slice(-2).join('/');
        
        await supabase.storage
          .from("reference-templates")
          .remove([storagePath]);
      } catch (storageError) {
        console.warn("Could not delete from storage:", storageError);
      }

      toast.success("Template supprimé");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getRoleIcon = () => {
    if (isSuperAdmin) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (isAdmin) return <Shield className="w-4 h-4 text-primary" />;
    return <UserCog className="w-4 h-4 text-muted-foreground" />;
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole || !hasPermission('manage_templates')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Gestion des Templates
              </h1>
              <p className="text-sm text-muted-foreground">
                Ajouter et gérer les templates de référence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getRoleIcon()}
            <span className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Form */}
          <Card className="bg-card/60 border-border/40 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Ajouter un template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Upload */}
              <div>
                <Label htmlFor="image">Image du template *</Label>
                <div 
                  className="mt-2 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour sélectionner une image
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Domain Select */}
              <div>
                <Label htmlFor="domain">Domaine *</Label>
                <Select
                  value={formData.domain}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sélectionner un domaine" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map(domain => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Catégorie de design *</Label>
                <Input
                  id="category"
                  value={formData.design_category}
                  onChange={(e) => setFormData(prev => ({ ...prev, design_category: e.target.value }))}
                  placeholder="ex: flyer, affiche, banner..."
                  className="mt-2"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description du template..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="église, prière, jeûne..."
                  className="mt-2"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !formData.domain || !formData.design_category}
                className="w-full bg-gradient-to-r from-primary to-accent"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Ajouter le template
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Templates List */}
          <Card className="bg-card/60 border-border/40 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">
                Templates existants ({templates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun template trouvé
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <img
                              src={template.image_url.startsWith('http') ? template.image_url : `/${template.image_url.replace(/^\//, '')}`}
                              alt={template.design_category}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          </TableCell>
                          <TableCell className="capitalize">
                            {DOMAINS.find(d => d.id === template.domain)?.name || template.domain}
                          </TableCell>
                          <TableCell className="capitalize">
                            {template.design_category.replace(/-/g, " ")}
                          </TableCell>
                          <TableCell>
                            {new Date(template.created_at).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            {hasPermission('delete_templates') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(template)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
