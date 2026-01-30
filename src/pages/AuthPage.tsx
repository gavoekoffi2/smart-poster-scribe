import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Loader2, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Track if auth was initiated by user action (not auto-redirect)
  const isUserInitiatedAuth = useRef(false);
  const hasCheckedSession = useRef(false);

  const handleSuccessfulAuth = async (isNewUser: boolean = false) => {
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
    
    // For new users, redirect to onboarding
    if (isNewUser) {
      navigate("/onboarding");
      return;
    }
    
    // For existing users, check if they completed onboarding
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .single();
      
      if (profile && !profile.onboarding_completed) {
        navigate("/onboarding");
        return;
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
        // Check if this is a confirmed email redirect (new user)
        const urlParams = new URLSearchParams(window.location.search);
        const isConfirmed = urlParams.get('confirmed') === 'true';
        
        if (isConfirmed) {
          // New user who just confirmed email - go to onboarding
          isUserInitiatedAuth.current = true;
          toast.success("Email confirmé ! Bienvenue sur Graphiste GPT !");
          handleSuccessfulAuth(true);
        } else {
          // Existing user already logged in
          handleSuccessfulAuth(false);
        }
      }
    };
    
    checkInitialSession();

    // Listen for auth changes (login/signup events only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only handle SIGNED_IN events from user actions
      if (event === 'SIGNED_IN' && session?.user && isUserInitiatedAuth.current) {
        handleSuccessfulAuth(false);
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
        // Auto-confirm enabled, proceed directly to onboarding for new users
        toast.success("Compte créé avec succès ! Bienvenue !");
        handleSuccessfulAuth(true); // true = new user
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    isUserInitiatedAuth.current = true;
    
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (error) {
        isUserInitiatedAuth.current = false;
        toast.error("Erreur lors de la connexion avec Google");
        console.error("Google OAuth error:", error);
      }
    } catch (error) {
      isUserInitiatedAuth.current = false;
      toast.error("Une erreur est survenue lors de la connexion avec Google");
      console.error("Google OAuth error:", error);
    } finally {
      setIsGoogleLoading(false);
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
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
              <LogoIcon size={48} />
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
                Créez un compte ou connectez-vous pour accéder à votre historique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signup" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary">
                  <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground">
                    Inscription
                  </TabsTrigger>
                  <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground">
                    Connexion
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {/* Google Sign Up Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-border hover:bg-secondary"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                      S'inscrire avec Google
                    </Button>

                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/50"></div>
                      </div>
                      <span className="relative bg-card px-3 text-xs text-muted-foreground">ou</span>
                    </div>

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

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    {/* Google Sign In Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-border hover:bg-secondary"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                      Se connecter avec Google
                    </Button>

                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/50"></div>
                      </div>
                      <span className="relative bg-card px-3 text-xs text-muted-foreground">ou</span>
                    </div>

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
