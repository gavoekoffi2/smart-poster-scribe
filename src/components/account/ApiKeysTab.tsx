import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  environment: "live" | "test";
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function ApiKeysTab() {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEnv, setNewEnv] = useState<"live" | "test">("live");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-api-keys", { method: "GET" });
    setLoading(false);
    if (error) {
      toast.error("Impossible de charger les clés API");
      return;
    }
    setKeys(data?.keys || []);
  };

  useEffect(() => { loadKeys(); }, []);

  const createKey = async () => {
    if (!newName.trim()) { toast.error("Donnez un nom à votre clé"); return; }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("manage-api-keys", {
      body: { name: newName.trim(), environment: newEnv },
    });
    setCreating(false);
    if (error || !data?.key) {
      toast.error("Création échouée");
      return;
    }
    setRevealedKey(data.key);
    setNewName("");
    setNewEnv("live");
    setCreateOpen(false);
    await loadKeys();
  };

  const revoke = async (id: string) => {
    if (!confirm("Révoquer cette clé ? Les requêtes existantes échoueront immédiatement.")) return;
    const { error } = await supabase.functions.invoke("manage-api-keys?action=revoke", { body: { id } });
    if (error) { toast.error("Révocation échouée"); return; }
    toast.success("Clé révoquée");
    await loadKeys();
  };

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copié !"); };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Clés API
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Intégrez la génération d'affiches GraphisteGPT dans vos propres applications.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/docs/api"><ExternalLink className="w-4 h-4 mr-2" />Documentation</Link>
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />Nouvelle clé</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une clé API</DialogTitle>
                  <DialogDescription>La clé complète ne sera affichée qu'une seule fois — copiez-la immédiatement.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label htmlFor="key-name">Nom</Label>
                    <Input id="key-name" placeholder="Ex : Production - mon-app-social" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Environnement</Label>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" variant={newEnv === "live" ? "default" : "outline"} size="sm" onClick={() => setNewEnv("live")}>Live (consomme crédits)</Button>
                      <Button type="button" variant={newEnv === "test" ? "default" : "outline"} size="sm" onClick={() => setNewEnv("test")}>Test (sandbox)</Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCreateOpen(false)}>Annuler</Button>
                  <Button onClick={createKey} disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {revealedKey && (
          <div className="mb-4 p-4 rounded-lg border-2 border-primary bg-primary/5">
            <p className="text-sm font-semibold mb-2">⚠️ Copiez votre clé maintenant — elle ne sera plus jamais affichée :</p>
            <div className="flex items-center gap-2 bg-background/80 p-2 rounded font-mono text-xs break-all">
              <span className="flex-1">{revealedKey}</span>
              <Button size="sm" variant="ghost" onClick={() => copy(revealedKey)}><Copy className="w-4 h-4" /></Button>
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setRevealedKey(null)}>J'ai copié la clé</Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 mx-auto animate-spin" /></div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune clé pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{k.name}</span>
                    <Badge variant={k.environment === "live" ? "default" : "secondary"} className="text-xs">{k.environment}</Badge>
                    {!k.is_active && <Badge variant="destructive" className="text-xs">Révoquée</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{k.key_prefix}…</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Créée le {new Date(k.created_at).toLocaleDateString("fr-FR")}
                    {k.last_used_at && ` • Utilisée le ${new Date(k.last_used_at).toLocaleDateString("fr-FR")}`}
                  </div>
                </div>
                {k.is_active && (
                  <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50">
        <h3 className="font-semibold mb-2">Démarrage rapide</h3>
        <p className="text-sm text-muted-foreground mb-3">Exemple minimal — génère une affiche en envoyant seulement le domaine et le sujet :</p>
        <pre className="text-xs bg-background/80 p-3 rounded overflow-x-auto"><code>{`curl -X POST https://bbfzfgcdioewzbmlgaqy.supabase.co/functions/v1/api-v1/v1/posters/generate \\
  -H "Authorization: Bearer VOTRE_CLE_API" \\
  -H "Content-Type: application/json" \\
  -d '{
    "domain": "restaurant",
    "subject": "Promo burger weekend",
    "mode": "quality"
  }'`}</code></pre>
        <p className="text-xs text-muted-foreground mt-3">
          Voir la <Link to="/docs/api" className="underline text-primary">documentation complète</Link> pour tous les paramètres et exemples.
        </p>
      </div>
    </div>
  );
}
