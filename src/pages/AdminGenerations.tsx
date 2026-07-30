import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, UserX, User as UserIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface GenerationRequest {
  id: string;
  user_id: string | null;
  is_anonymous: boolean;
  prompt: string | null;
  domain: string | null;
  aspect_ratio: string | null;
  resolution: string | null;
  is_modification: boolean;
  status: string;
  job_id: string | null;
  error_message: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  job_status: string | null;
  result_url: string | null;
}

const statusVariant = (req: GenerationRequest) => {
  const s = req.job_status || req.status;
  if (s === "completed") return { label: "Réussie", className: "bg-green-500/15 text-green-500 border-green-500/30" };
  if (s === "failed") return { label: "Échec", className: "bg-destructive/15 text-destructive border-destructive/30" };
  if (s === "processing") return { label: "En cours", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" };
  return { label: "Reçue", className: "bg-muted text-muted-foreground" };
};

export default function AdminGenerations() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<GenerationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_generation_requests", {
      p_admin_id: user.id,
      p_limit: 300,
    });
    if (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des demandes");
    } else {
      setRequests((data || []) as GenerationRequest[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Rafraîchissement temps réel
  useEffect(() => {
    const channel = supabase
      .channel("admin-generation-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "generation_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = requests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.prompt || "").toLowerCase().includes(q) ||
      (r.user_email || "").toLowerCase().includes(q) ||
      (r.user_name || "").toLowerCase().includes(q) ||
      (r.domain || "").toLowerCase().includes(q)
    );
  });

  const anonCount = requests.filter((r) => r.is_anonymous).length;
  const successCount = requests.filter((r) => (r.job_status || r.status) === "completed").length;
  const failCount = requests.filter((r) => (r.job_status || r.status) === "failed").length;

  return (
    <AdminLayout requiredPermission="view_dashboard">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Demandes de génération</h1>
            <p className="text-sm text-muted-foreground">
              Toutes les affiches demandées, y compris par les visiteurs non inscrits.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total", value: requests.length },
            { label: "Visiteurs non inscrits", value: anonCount },
            { label: "Réussies", value: successCount },
            { label: "Échecs", value: failCount },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Input
          placeholder="Rechercher un contenu, un email, un domaine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune demande pour le moment</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const st = statusVariant(r);
              return (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline" className={st.className}>{st.label}</Badge>
                      {r.is_anonymous ? (
                        <Badge variant="outline" className="gap-1"><UserX className="w-3 h-3" /> Non inscrit</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <UserIcon className="w-3 h-3" />
                          {r.user_name || r.user_email || "Utilisateur"}
                        </Badge>
                      )}
                      {r.domain && <Badge variant="secondary">{r.domain}</Badge>}
                      {r.aspect_ratio && <Badge variant="secondary">{r.aspect_ratio}</Badge>}
                      {r.resolution && <Badge variant="secondary">{r.resolution}</Badge>}
                      {r.is_modification && <Badge variant="secondary">Modification</Badge>}
                      <span className="text-muted-foreground ml-auto">
                        {new Date(r.created_at).toLocaleString("fr-FR")}
                      </span>
                    </div>

                    <p className="text-sm whitespace-pre-wrap break-words line-clamp-6">
                      {r.prompt || "(aucun contenu)"}
                    </p>

                    {r.error_message && (
                      <p className="text-xs text-destructive">Erreur : {r.error_message}</p>
                    )}

                    {r.result_url && (
                      <a
                        href={r.result_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Voir l'affiche générée
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
