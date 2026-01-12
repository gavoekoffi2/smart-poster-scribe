import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Upload, Plus, X, Image } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface DesignerProfile {
  id: string;
  is_verified: boolean;
}

const DOMAINS = [
  { value: "church", label: "Église" },
  { value: "event", label: "Événement" },
  { value: "restaurant", label: "Restaurant" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "formation", label: "Formation" },
  { value: "fashion", label: "Mode" },
  { value: "service", label: "Service" },
];

const DesignerUpload = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [designerProfile, setDesignerProfile] = useState<DesignerProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    domain: "",
    category: "",
    description: "",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Check if user is a verified designer
      const { data: designer, error: designerError } = await supabase
        .from("partner_designers")
        .select("id, is_verified")
        .eq("user_id", user.id)
        .single();

      if (designerError) {
        if (designerError.code === "PGRST116") {
          toast.error("Vous devez d'abord vous inscrire comme graphiste");
          navigate("/designer/register");
          return;
        }
        throw designerError;
      }

      setDesignerProfile(designer);

      if (!designer.is_verified) {
        toast.error("Votre profil doit être validé avant de pouvoir ajouter des templates");
        navigate("/designer/dashboard");
        return;
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("design_categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 5 Mo");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const createCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const slug = newCategory.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      
      const { data, error } = await supabase
        .from("design_categories")
        .insert({
          name: newCategory.trim(),
          slug,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Cette catégorie existe déjà");
        } else {
          throw error;
        }
        return;
      }

      setCategories([...categories, data]);
      setFormData({ ...formData, category: data.slug });
      setNewCategory("");
      setShowNewCategory(false);
      toast.success("Catégorie créée !");
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error("Erreur lors de la création de la catégorie");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!designerProfile?.is_verified) {
      toast.error("Votre profil doit être validé");
      return;
    }

    if (!imageFile) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (!formData.domain || !formData.category) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      // Upload image to storage
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${designerProfile.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("reference-templates")
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("reference-templates")
        .getPublicUrl(fileName);

      // Create template record
      const { error: insertError } = await supabase
        .from("reference_templates")
        .insert({
          image_url: urlData.publicUrl,
          domain: formData.domain,
          design_category: formData.category,
          description: formData.description.trim() || null,
          tags: tags.length > 0 ? tags : null,
          designer_id: designerProfile.id,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success("Template ajouté avec succès !");
      navigate("/designer/dashboard");
    } catch (error: any) {
      console.error("Error uploading template:", error);
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/designer/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au tableau de bord
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Ajouter un template
            </CardTitle>
            <CardDescription>
              Uploadez un nouveau design pour l'ajouter à la bibliothèque
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Image du template *</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${imagePreview ? "border-primary" : "border-muted-foreground/25 hover:border-primary/50"}`}
                  onClick={() => document.getElementById("image-input")?.click()}
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour sélectionner une image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, WebP • Max 5 Mo
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <Label>Domaine *</Label>
                <Select
                  value={formData.domain}
                  onValueChange={(value) => setFormData({ ...formData, domain: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un domaine" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((domain) => (
                      <SelectItem key={domain.value} value={domain.value}>
                        {domain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                {showNewCategory ? (
                  <div className="flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Nom de la nouvelle catégorie"
                    />
                    <Button type="button" onClick={createCategory}>
                      Créer
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowNewCategory(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowNewCategory(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nouvelle
                    </Button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez votre design..."
                  rows={3}
                  maxLength={300}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags (optionnel)</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Ajouter un tag"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Upload en cours..." : "Ajouter le template"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DesignerUpload;
