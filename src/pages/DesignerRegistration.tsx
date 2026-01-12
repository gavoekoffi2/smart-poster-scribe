import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Palette, Upload, CheckCircle } from "lucide-react";

const DesignerRegistration = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    portfolioUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Vous devez être connecté pour vous inscrire");
      navigate("/auth");
      return;
    }

    if (!formData.displayName.trim()) {
      toast.error("Le nom d'affichage est requis");
      return;
    }

    setLoading(true);
    try {
      // Check if already registered
      const { data: existing } = await supabase
        .from("partner_designers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        toast.error("Vous êtes déjà inscrit comme graphiste partenaire");
        navigate("/designer/dashboard");
        return;
      }

      // Create designer profile
      const { error } = await supabase.from("partner_designers").insert({
        user_id: user.id,
        display_name: formData.displayName.trim(),
        bio: formData.bio.trim() || null,
        portfolio_url: formData.portfolioUrl.trim() || null,
        is_verified: false,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Demande envoyée avec succès !");
    } catch (error: any) {
      console.error("Error submitting designer registration:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Palette className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Connexion requise</CardTitle>
            <CardDescription>
              Vous devez être connecté pour vous inscrire comme graphiste partenaire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <CardTitle>Demande envoyée !</CardTitle>
            <CardDescription>
              Votre demande d'inscription a été soumise avec succès. 
              Un administrateur va examiner votre profil et vous recevrez une notification une fois validé.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Palette className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Devenir Graphiste Partenaire</CardTitle>
            <CardDescription>
              Rejoignez notre communauté de créateurs et gagnez des royalties 
              chaque fois que vos designs sont utilisés par notre IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nom d'affichage *</Label>
                <Input
                  id="displayName"
                  placeholder="Ex: Studio Créatif Design"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  required
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Ce nom sera affiché publiquement sur vos créations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biographie</Label>
                <Textarea
                  id="bio"
                  placeholder="Parlez-nous de votre expérience, votre style, vos spécialités..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.bio.length}/500 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolioUrl">Lien vers votre portfolio</Label>
                <Input
                  id="portfolioUrl"
                  type="url"
                  placeholder="https://votre-portfolio.com"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Behance, Dribbble, site personnel...
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Comment ça marche ?
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Soumettez votre candidature</li>
                  <li>• Un admin valide votre profil</li>
                  <li>• Uploadez vos designs sur la plateforme</li>
                  <li>• Gagnez des royalties à chaque utilisation</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi en cours..." : "Soumettre ma candidature"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DesignerRegistration;
