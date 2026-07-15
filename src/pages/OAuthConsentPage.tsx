import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";

// Typed shim for the beta supabase.auth.oauth namespace
type OAuthResult = {
  data: { client?: { name?: string; redirect_uris?: string[] }; redirect_url?: string; redirect_to?: string; scope?: string } | null;
  error: { message: string } | null;
};
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) { setError("Paramètre authorization_id manquant."); return; }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?redirect=" + encodeURIComponent(next);
        return;
      }
      setUserEmail(sess.session.user.email ?? null);
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) { setError(error.message); return; }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("Aucune URL de redirection reçue."); return; }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-border/40 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-3">
            <LogoIcon size={40} />
          </div>
          <CardTitle className="font-display text-xl">
            Connecter {details?.client?.name ?? "une application"} à GraphisteGPT
          </CardTitle>
          <CardDescription>
            {userEmail ? `Connecté en tant que ${userEmail}` : "Autorisation d'accès"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              {error}
            </div>
          )}

          {!details && !error && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {details && !error && (
            <>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm space-y-2">
                <div className="flex gap-2 items-start">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p>
                    <strong>{details.client?.name ?? "Cette application"}</strong> pourra appeler les outils GraphisteGPT en votre nom
                    tant que vous êtes connecté.
                  </p>
                </div>
                <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
                  <li>Consulter votre solde de crédits et votre abonnement</li>
                  <li>Lister et lire vos affiches générées</li>
                  <li>Rechercher dans le catalogue public de modèles</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Cette autorisation ne contourne pas les règles d'accès de votre compte. Vous pourrez la révoquer à tout moment.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                  Refuser
                </Button>
                <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Autoriser"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
