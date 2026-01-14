import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Mail, Lock, User, Loader2, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { z } from "zod";

const emailSchema = z.string().email("Email invalide");
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");

interface LocationState {
  redirectTo?: string;
  pendingClone?: boolean;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Track if auth was initiated by user action (not auto-redirect)
  const isUserInitiatedAuth = useRef(false);
  const hasCheckedSession = useRef(false);

  const handleSuccessfulAuth = () => {
    // Only proceed if this was user-initiated or initial session check
    if (!isUserInitiatedAuth.current && hasCheckedSession.current) {
      return;
    }
    
    // Check if there's a pending clone template
    const pendingTemplate = sessionStorage.getItem('pendingCloneTemplate');
    
    if (pendingTemplate) {
      try {
        const template = JSON.parse(pendingTemplate);
        sessionStorage.removeItem('pendingCloneTemplate');
        navigate("/app", {
          state: {
            cloneTemplate: template
          }
        });
        return;
      } catch (e) {
        console.error("Error parsing pending template:", e);
      }
    }
    
    // Default redirect
    const redirectTo = locationState?.redirectTo || "/app";
    navigate(redirectTo);
  };

  useEffect(() => {
    // Only check session once on mount
    if (hasCheckedSession.current) return;
    
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      hasCheckedSession.current = true;
      
      if (session?.user) {
        // User is already logged in, redirect
        handleSuccessfulAuth();
      }
    };
    
    checkInitialSession();

    // Listen for auth changes (login/signup events only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only handle SIGNED_IN events from user actions
      if (event === 'SIGNED_IN' && session?.user && isUserInitiatedAuth.current) {
        handleSuccessfulAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendConfirmation = async () => {
    if (!email || resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?confirmed=true`
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Email de confirmation renvoyé !");
        setResendCooldown(60); // 60 seconds cooldown
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setIsResending(false);
    }
  };

  const validateInputs = (isSignUp: boolean) => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (isSignUp && !fullName.trim()) {
        toast.error("Veuillez entrer votre nom complet");
        return false;
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;

    setIsLoading(true);
    isUserInitiatedAuth.current = true;
    
    try {
      const redirectUrl = `${window.location.origin}/auth?confirmed=true`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        isUserInitiatedAuth.current = false;
        if (error.message.includes("already registered")) {
          toast.error("Cet email est déjà utilisé. Essayez de vous connecter.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation required
        setPendingEmailConfirmation(true);
        toast.success("Un email de confirmation a été envoyé. Vérifiez votre boîte mail !");
      } else if (data.user && data.session) {
        // Auto-confirm enabled, proceed directly
        toast.success("Compte créé avec succès ! Bienvenue !");
        handleSuccessfulAuth();
      }
    } catch (error) {
      isUserInitiatedAuth.current = false;
      toast.error("Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(false)) return;

    setIsLoading(true);
    isUserInitiatedAuth.current = true;
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        isUserInitiatedAuth.current = false;
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou mot de passe incorrect");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Veuillez confirmer votre email avant de vous connecter");
          setPendingEmailConfirmation(true);
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        toast.success("Connexion réussie !");
        handleSuccessfulAuth();
      }
    } catch (error) {
      isUserInitiatedAuth.current = false;
      toast.error("Une erreur est survenue lors de la connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/15 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/15 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Retour à l'accueil
        </Link>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 rounded-xl blur-xl" />
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Graphiste <span className="gradient-text">GPT</span>
            </h1>
            <p className="text-xs text-muted-foreground">IA Design Premium</p>
          </div>
        </div>

        {pendingEmailConfirmation ? (
          <Card className="bg-card/60 backdrop-blur-xl border-border/40 shadow-2xl shadow-primary/5">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-2xl">Vérifiez votre email</CardTitle>
              <CardDescription className="text-base mt-2">
                Un email de confirmation a été envoyé à <strong className="text-foreground">{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-sm text-muted-foreground text-center">
                  Cliquez sur le lien dans l'email pour activer votre compte.
                  Vérifiez aussi vos spams si vous ne le trouvez pas.
                </p>
              </div>
              
              <Button 
                variant="secondary"
                className="w-full"
                onClick={handleResendConfirmation}
                disabled={isResending || resendCooldown > 0}
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Renvoyer dans {resendCooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Renvoyer l'email de confirmation
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setPendingEmailConfirmation(false);
                  setEmail("");
                  setPassword("");
                  setFullName("");
                  setResendCooldown(0);
                }}
              >
                Retour à la connexion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/60 backdrop-blur-xl border-border/40 shadow-2xl shadow-primary/5">
            <CardHeader className="text-center pb-4">
              <CardTitle className="font-display text-2xl">Bienvenue</CardTitle>
              <CardDescription>
                Connectez-vous ou créez un compte pour accéder à votre historique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary">
                  <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground">
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground">
                    Inscription
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-secondary border-border focus:border-primary"
                          disabled={isLoading}
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 bg-secondary border-border focus:border-primary"
                          disabled={isLoading}
                          autoComplete="current-password"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        "Se connecter"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10 bg-secondary border-border focus:border-primary"
                          disabled={isLoading}
                          autoComplete="name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-secondary border-border focus:border-primary"
                          disabled={isLoading}
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 bg-secondary border-border focus:border-primary"
                          disabled={isLoading}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Création...
                        </>
                      ) : (
                        "Créer un compte"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          En continuant, vous acceptez nos conditions d'utilisation.
        </p>
      </div>
    </div>
  );
}
