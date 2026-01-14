import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, Building2, Palette, Upload, Check, 
  ArrowRight, ArrowLeft, Loader2, User, Target, 
  MessageSquare, Plus, X 
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "welcome", title: "Bienvenue", icon: Sparkles },
  { id: "business", title: "Votre entreprise", icon: Building2 },
  { id: "branding", title: "Votre identité", icon: Palette },
  { id: "about", title: "À propos de vous", icon: User },
  { id: "complete", title: "Terminé", icon: Check },
];

const INDUSTRIES = [
  "Restaurant / Alimentation",
  "Mode / Beauté",
  "Église / Religion",
  "Formation / Éducation",
  "Événementiel",
  "Commerce / E-commerce",
  "Services professionnels",
  "Santé / Bien-être",
  "Technologie",
  "Autre",
];

const REFERRAL_SOURCES = [
  "Réseaux sociaux (Facebook, Instagram, TikTok)",
  "Bouche à oreille",
  "Recherche Google",
  "Publicité en ligne",
  "Un ami ou collègue",
  "Autre",
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Form data
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("#FF6B35");
  const [howHeard, setHowHeard] = useState("");
  const [expectations, setExpectations] = useState("");
  
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Check if user already completed onboarding
    const checkOnboarding = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, company_name, industry")
        .eq("user_id", user.id)
        .single();
      
      if (data?.onboarding_completed) {
        navigate("/app");
      } else if (data?.company_name) {
        setCompanyName(data.company_name);
      }
      if (data?.industry) {
        setIndustry(data.industry);
      }
    };
    
    checkOnboarding();
  }, [user, navigate]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 5 Mo)");
      return;
    }
    
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addColor = () => {
    if (colorPalette.length >= 5) {
      toast.error("Maximum 5 couleurs");
      return;
    }
    if (!colorPalette.includes(newColor)) {
      setColorPalette([...colorPalette, newColor]);
    }
  };

  const removeColor = (color: string) => {
    setColorPalette(colorPalette.filter(c => c !== color));
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      let logoUrl = null;
      
      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${user.id}/logo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("temp-images")
          .upload(fileName, logoFile, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("temp-images")
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }
      
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: companyName || null,
          industry: industry || null,
          default_logo_url: logoUrl,
          default_color_palette: colorPalette.length > 0 ? colorPalette : null,
          how_heard_about_us: howHeard || null,
          expectations: expectations || null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast.success("Configuration terminée !");
      navigate("/app");
    } catch (error: any) {
      console.error("Error saving onboarding:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);
      
      navigate("/app");
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      navigate("/app");
    }
  };

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 0));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[150px] translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[200px]" />
      
      <div className="relative z-10 container max-w-2xl mx-auto px-4 py-8 md:py-16">
        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: index === currentStep ? 1.2 : 1, 
                opacity: index <= currentStep ? 1 : 0.4 
              }}
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                index === currentStep 
                  ? "bg-gradient-to-r from-primary to-accent" 
                  : index < currentStep 
                    ? "bg-primary/60"
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30"
              >
                <Sparkles className="w-12 h-12 text-primary-foreground" />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4"
              >
                Bienvenue sur <span className="gradient-text">Graphiste GPT</span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-lg mb-8 max-w-md mx-auto"
              >
                Personnalisons votre expérience pour créer des visuels parfaits pour votre entreprise.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button
                  onClick={nextStep}
                  className="glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8 py-6"
                >
                  Commencer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Passer pour l'instant
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 1: Business Info */}
          {currentStep === 1 && (
            <motion.div
              key="business"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-card/60 backdrop-blur-xl border-border/40 shadow-2xl">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
                      <Building2 className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-bold">Votre entreprise</h2>
                      <p className="text-muted-foreground text-sm">Parlez-nous de votre activité</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nom de votre entreprise</Label>
                      <Input
                        id="companyName"
                        placeholder="Ex: Ma Belle Entreprise"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="bg-secondary border-border focus:border-primary"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Secteur d'activité</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {INDUSTRIES.map((ind) => (
                          <motion.button
                            key={ind}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIndustry(ind)}
                            className={cn(
                              "p-3 rounded-xl text-left text-sm transition-all border",
                              industry === ind
                                ? "bg-primary/20 border-primary text-foreground"
                                : "bg-secondary/50 border-border hover:border-primary/50 text-muted-foreground"
                            )}
                          >
                            {ind}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="bg-gradient-to-r from-primary to-accent"
                    >
                      Continuer
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Branding */}
          {currentStep === 2 && (
            <motion.div
              key="branding"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-card/60 backdrop-blur-xl border-border/40 shadow-2xl">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
                      <Palette className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-bold">Votre identité visuelle</h2>
                      <p className="text-muted-foreground text-sm">Ces éléments seront utilisés par défaut</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Logo upload */}
                    <div className="space-y-3">
                      <Label>Logo de votre entreprise (optionnel)</Label>
                      <div className="flex items-center gap-4">
                        <motion.label
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "w-24 h-24 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center transition-colors",
                            logoPreview 
                              ? "border-primary bg-primary/10" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                          ) : (
                            <Upload className="w-8 h-8 text-muted-foreground" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </motion.label>
                        <div className="text-sm text-muted-foreground">
                          <p>Formats: PNG, JPG, SVG</p>
                          <p>Taille max: 5 Mo</p>
                        </div>
                      </div>
                    </div>

                    {/* Color palette */}
                    <div className="space-y-3">
                      <Label>Palette de couleurs (optionnel)</Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {colorPalette.map((color) => (
                          <motion.div
                            key={color}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="relative group"
                          >
                            <div
                              className="w-12 h-12 rounded-xl border-2 border-border shadow-lg"
                              style={{ backgroundColor: color }}
                            />
                            <button
                              onClick={() => removeColor(color)}
                              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                        {colorPalette.length < 5 && (
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={newColor}
                              onChange={(e) => setNewColor(e.target.value)}
                              className="w-12 h-12 rounded-xl cursor-pointer border-2 border-border"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={addColor}
                              className="w-12 h-12"
                            >
                              <Plus className="w-5 h-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ajoutez jusqu'à 5 couleurs représentant votre marque
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="bg-gradient-to-r from-primary to-accent"
                    >
                      Continuer
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: About You */}
          {currentStep === 3 && (
            <motion.div
              key="about"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-card/60 backdrop-blur-xl border-border/40 shadow-2xl">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
                      <MessageSquare className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-bold">Aidez-nous à vous connaître</h2>
                      <p className="text-muted-foreground text-sm">Pour améliorer notre service</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label>Comment avez-vous découvert Graphiste GPT ?</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {REFERRAL_SOURCES.map((source) => (
                          <motion.button
                            key={source}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setHowHeard(source)}
                            className={cn(
                              "p-3 rounded-xl text-left text-sm transition-all border",
                              howHeard === source
                                ? "bg-primary/20 border-primary text-foreground"
                                : "bg-secondary/50 border-border hover:border-primary/50 text-muted-foreground"
                            )}
                          >
                            {source}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expectations">
                        <Target className="w-4 h-4 inline mr-2" />
                        Qu'attendez-vous de Graphiste GPT ?
                      </Label>
                      <Textarea
                        id="expectations"
                        placeholder="Ex: Créer des visuels pour mes réseaux sociaux, des flyers pour mon restaurant..."
                        value={expectations}
                        onChange={(e) => setExpectations(e.target.value)}
                        className="bg-secondary border-border focus:border-primary min-h-[100px]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={prevStep}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="bg-gradient-to-r from-primary to-accent"
                    >
                      Continuer
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30"
              >
                <Check className="w-12 h-12 text-white" />
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-display text-3xl font-bold text-foreground mb-4"
              >
                Vous êtes prêt !
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-lg mb-8 max-w-md mx-auto"
              >
                Votre profil est configuré. Commencez à créer des visuels professionnels dès maintenant !
              </motion.p>

              {/* Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto"
              >
                <h3 className="font-semibold mb-4 text-foreground">Récapitulatif</h3>
                <div className="space-y-3 text-sm">
                  {companyName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entreprise</span>
                      <span className="text-foreground font-medium">{companyName}</span>
                    </div>
                  )}
                  {industry && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Secteur</span>
                      <span className="text-foreground font-medium">{industry}</span>
                    </div>
                  )}
                  {logoPreview && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Logo</span>
                      <img src={logoPreview} alt="Logo" className="w-8 h-8 object-contain rounded" />
                    </div>
                  )}
                  {colorPalette.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Couleurs</span>
                      <div className="flex gap-1">
                        {colorPalette.map((color) => (
                          <div
                            key={color}
                            className="w-6 h-6 rounded-md border border-border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8 py-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      Commencer à créer
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
