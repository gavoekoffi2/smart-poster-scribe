import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Sparkles, 
  Crown, 
  History, 
  CreditCard, 
  LogOut, 
  Settings, 
  Camera,
  Palette,
  Image as ImageIcon,
  User,
  Building,
  Phone,
  Globe,
  Upload,
  X,
  Check,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditBalance } from "@/components/credits/CreditBalance";
import { ColorPalette } from "@/components/chat/ColorPalette";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { subscription, transactions, refreshSubscription } = useSubscription();
  const { 
    profile, 
    isLoading: profileLoading, 
    updateProfile, 
    updateAvatar, 
    updateCover, 
    updateDefaultLogo,
    updateDefaultColors,
    removeDefaultLogo 
  } = useUserProfile();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    company_name: "",
    phone: "",
    website: "",
  });
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Handle payment success redirect
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast.success("Paiement réussi ! Votre abonnement est maintenant actif.");
      refreshSubscription();
      window.history.replaceState({}, "", "/account");
    }
  }, [searchParams, refreshSubscription]);

  // Redirect if not logged in (only after auth check is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/account");
    }
  }, [user, authLoading, navigate]);

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        company_name: profile.company_name || "",
        phone: profile.phone || "",
        website: profile.website || "",
      });
      setSelectedColors(profile.default_color_palette || []);
    }
  }, [profile]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await updateAvatar(file);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await updateCover(file);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await updateDefaultLogo(file);
    }
  };

  const handleSaveProfile = async () => {
    const success = await updateProfile(formData);
    if (success) {
      setEditMode(false);
    }
  };

  const handleSaveColors = async () => {
    await updateDefaultColors(selectedColors);
    setShowColorPicker(false);
  };

  const planName = subscription?.plan?.name || "Gratuit";
  const periodEnd = subscription?.current_period_end
    ? format(new Date(subscription.current_period_end), "d MMMM yyyy", { locale: fr })
    : null;

  const transactionTypeLabels: Record<string, string> = {
    subscription_renewal: "Renouvellement",
    purchase: "Achat",
    generation: "Génération",
    refund: "Remboursement",
    bonus: "Bonus",
    free_generation: "Génération gratuite",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding banner for users who haven't completed it */}
      {profile && !profile.onboarding_completed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground py-3 px-4"
        >
          <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">
                Personnalisez votre expérience avec vos informations par défaut
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/onboarding")}
              className="text-xs"
            >
              Configurer maintenant
            </Button>
          </div>
        </motion.div>
      )}
      
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10">
        {profile?.cover_image_url && (
          <img 
            src={profile.cover_image_url} 
            alt="Couverture" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-4 right-4 gap-2 backdrop-blur-sm"
          onClick={() => coverInputRef.current?.click()}
        >
          <Camera className="w-4 h-4" />
          Modifier la couverture
        </Button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverChange}
          className="hidden"
        />
        
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app")}
          className="absolute top-4 left-4 gap-2 backdrop-blur-sm bg-background/50"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>

      {/* Profile Header */}
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="relative -mt-16 md:-mt-20 mb-6 flex flex-col md:flex-row items-start md:items-end gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-card border-4 border-background shadow-xl overflow-hidden">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full shadow-lg"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Camera className="w-4 h-4" />
            </Button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Name & Email */}
          <div className="flex-1 pb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {profile?.full_name || "Utilisateur"}
            </h1>
            <p className="text-muted-foreground">{user.email}</p>
            {profile?.company_name && (
              <p className="text-sm text-primary flex items-center gap-1 mt-1">
                <Building className="w-3.5 h-3.5" />
                {profile.company_name}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              {editMode ? "Annuler" : "Modifier"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50 p-1">
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="w-4 h-4" />
              Préférences
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <Crown className="w-4 h-4" />
              Abonnement
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Informations du profil
                </h2>

                {editMode ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nom complet</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Votre nom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Entreprise</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+237 6XX XXX XXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Site web</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://votre-site.com"
                      />
                    </div>
                    <Button onClick={handleSaveProfile} className="w-full gap-2">
                      <Check className="w-4 h-4" />
                      Enregistrer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{profile?.full_name || "Non défini"}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{profile?.company_name || "Non défini"}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{profile?.phone || "Non défini"}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{profile?.website || "Non défini"}</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Default Branding */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Branding par défaut
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Définissez votre logo et vos couleurs par défaut pour accélérer la création de vos affiches.
                </p>

                {/* Default Logo */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Logo par défaut</Label>
                  <div className="flex items-center gap-4">
                    {profile?.default_logo_url ? (
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-xl bg-muted/50 border border-border/50 overflow-hidden">
                          <img 
                            src={profile.default_logo_url} 
                            alt="Logo par défaut" 
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={removeDefaultLogo}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl bg-muted/30 border-2 border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
                      >
                        <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground">Ajouter</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Ce logo sera proposé par défaut lors de la création de vos affiches.
                      </p>
                      {profile?.default_logo_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 gap-2"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Changer
                        </Button>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Default Colors */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Palette de couleurs par défaut</Label>
                  {showColorPicker ? (
                    <div className="space-y-4">
                      <ColorPalette
                        selectedColors={selectedColors}
                        onColorsChange={setSelectedColors}
                        onConfirm={handleSaveColors}
                        disabled={false}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowColorPicker(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        {profile?.default_color_palette && profile.default_color_palette.length > 0 ? (
                          profile.default_color_palette.map((color, i) => (
                            <div
                              key={i}
                              className="w-10 h-10 rounded-lg border border-border/50 shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))
                        ) : (
                          <div className="flex gap-2">
                            {["#888", "#aaa", "#ccc"].map((color, i) => (
                              <div
                                key={i}
                                className="w-10 h-10 rounded-lg border border-dashed border-border/50"
                                style={{ backgroundColor: color, opacity: 0.3 }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowColorPicker(true)}
                        className="gap-2"
                      >
                        <Palette className="w-4 h-4" />
                        {profile?.default_color_palette?.length ? "Modifier" : "Définir"}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Credit balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CreditBalance onUpgrade={() => navigate("/pricing")} />
              </motion.div>

              {/* Current subscription */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Abonnement actuel
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/pricing")}
                  >
                    Changer de plan
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-foreground">{planName}</div>
                      {periodEnd && (
                        <div className="text-sm text-muted-foreground">
                          Prochain renouvellement: {periodEnd}
                        </div>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subscription?.status === "active"
                        ? "bg-green-500/10 text-green-500 border border-green-500/30"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {subscription?.status === "active" ? "Actif" : "Inactif"}
                    </div>
                  </div>
                </div>

                {subscription?.plan?.slug === "free" && (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-foreground">Passez à Pro</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Débloquez toutes les résolutions, supprimez le filigrane et obtenez 50 crédits par mois.
                        </div>
                        <Button
                          size="sm"
                          className="mt-3 bg-gradient-to-r from-primary to-accent"
                          onClick={() => navigate("/pricing")}
                        >
                          Voir les plans
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" />
                Historique des crédits
              </h2>

              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucune transaction pour le moment</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          tx.amount > 0 ? "bg-green-500" : "bg-primary"
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {transactionTypeLabels[tx.type] || tx.type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                            {tx.resolution_used && ` • ${tx.resolution_used}`}
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        tx.amount > 0 ? "text-green-500" : "text-foreground"
                      }`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 mb-8 p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
        >
          <h2 className="text-lg font-semibold mb-2">Besoin d'aide ?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Notre équipe est disponible pour répondre à vos questions.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.href = "mailto:support@graphiste-gpt.com"}
          >
            Contacter le support
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
