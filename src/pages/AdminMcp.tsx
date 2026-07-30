import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Plug, ShieldAlert, Trash2, Plus, Copy, RefreshCw } from "lucide-react";

type Agent = {
  label: string;
  user_id: string;
  enabled: boolean;
  allow_admin_tools: boolean;
  disabled_tools: string[];
};

type McpConfig = {
  enabled: boolean;
  mode: "all" | "allowlist";
  disabled_tools: string[];
  agents: Agent[];
};

const DEFAULT_CONFIG: McpConfig = { enabled: true, mode: "allowlist", disabled_tools: [], agents: [] };

const TOOLS: { name: string; label: string; admin?: boolean; write?: boolean }[] = [
  { name: "get_my_account", label: "Voir son compte" },
  { name: "get_my_credits", label: "Voir ses crédits" },
  { name: "list_my_posters", label: "Lister ses affiches" },
  { name: "get_poster", label: "Détail d'une affiche" },
  { name: "search_templates", label: "Rechercher des modèles" },
  { name: "generate_poster", label: "Générer une affiche", write: true },
  { name: "get_job_status", label: "Suivre une génération" },
  { name: "modify_poster", label: "Modifier une affiche", write: true },
  { name: "rate_poster", label: "Noter une affiche", write: true },
  { name: "admin_list_generation_requests", label: "Journal des générations", admin: true },
  { name: "admin_generation_stats", label: "Statistiques de génération", admin: true },
  { name: "admin_list_users", label: "Lister les utilisateurs", admin: true },
  { name: "admin_moderate_showcase", label: "Modérer la vitrine", admin: true, write: true },
  { name: "admin_set_subscription", label: "Attribuer un abonnement", admin: true, write: true },
];

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;

type UserRow = { user_id: string; full_name: string | null; email: string | null };

export default function AdminMcp() {
  const [config, setConfig] = useState<McpConfig>(DEFAULT_CONFIG);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [newLabel, setNewLabel] = useState("Hermès");

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: setting }, usersRes] = await Promise.all([
      supabase.from("platform_settings").select("value").eq("key", "mcp_access").maybeSingle(),
      user ? supabase.rpc("admin_get_users_with_subscriptions", { p_admin_id: user.id }) : Promise.resolve({ data: [] } as any),
    ]);
    const raw = (setting?.value ?? {}) as Partial<McpConfig>;
    setConfig({
      enabled: raw.enabled ?? true,
      mode: (raw.mode as McpConfig["mode"]) ?? "allowlist",
      disabled_tools: raw.disabled_tools ?? [],
      agents: (raw.agents ?? []).map((a: any) => ({
        label: a.label ?? "Agent",
        user_id: a.user_id,
        enabled: a.enabled ?? true,
        allow_admin_tools: a.allow_admin_tools ?? false,
        disabled_tools: a.disabled_tools ?? [],
      })),
    });
    setUsers(((usersRes as any)?.data ?? []).map((u: any) => ({ user_id: u.user_id, full_name: u.full_name, email: u.email })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const persist = async (next: McpConfig) => {
    setConfig(next);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.rpc("admin_set_platform_setting", {
      p_admin_id: user.id,
      p_key: "mcp_access",
      p_value: next as any,
    });
    if (error) toast.error(error.message);
    else toast.success("Configuration MCP enregistrée");
    setSaving(false);
  };

  const updateAgent = (userId: string, patch: Partial<Agent>) =>
    persist({ ...config, agents: config.agents.map((a) => (a.user_id === userId ? { ...a, ...patch } : a)) });

  const removeAgent = (userId: string) =>
    persist({ ...config, agents: config.agents.filter((a) => a.user_id !== userId) });

  const addAgent = (u: UserRow) => {
    if (config.agents.some((a) => a.user_id === u.user_id)) {
      toast.info("Ce compte est déjà autorisé");
      return;
    }
    persist({
      ...config,
      agents: [
        ...config.agents,
        { label: newLabel.trim() || u.full_name || u.email || "Agent", user_id: u.user_id, enabled: true, allow_admin_tools: false, disabled_tools: [] },
      ],
    });
    setSearch("");
  };

  const candidates = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return [];
    return users
      .filter((u) => [u.full_name, u.email, u.user_id].some((v) => typeof v === "string" && v.toLowerCase().includes(s)))
      .slice(0, 6);
  }, [search, users]);

  const nameOf = (id: string) => {
    const u = users.find((x) => x.user_id === id);
    return u?.email ?? u?.full_name ?? id;
  };

  if (loading) {
    return (
      <AdminLayout requiredPermission="manage_admins">
        <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout requiredPermission="manage_admins">
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Plug className="w-6 h-6 text-primary" /> Intégrations agents (MCP)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autorisez ou désautorisez des agents IA (comme Hermès) à piloter GraphisteGPT, et choisissez précisément les actions qu'ils peuvent effectuer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Point de connexion</CardTitle>
            <CardDescription>URL à renseigner dans le client MCP de l'agent. La connexion se fait avec un compte GraphisteGPT.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={MCP_URL} className="font-mono text-xs" />
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(MCP_URL); toast.success("URL copiée"); }}>
              <Copy className="w-4 h-4 mr-2" /> Copier
            </Button>
            <Button variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contrôle global</CardTitle>
            <CardDescription>Coupe-circuit et politique d'accès appliqués à tous les agents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Serveur MCP actif</Label>
                <p className="text-xs text-muted-foreground">Si désactivé, aucun agent ne peut exécuter d'outil.</p>
              </div>
              <Switch checked={config.enabled} onCheckedChange={(v) => persist({ ...config, enabled: v })} disabled={saving} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Restreindre aux agents autorisés</Label>
                <p className="text-xs text-muted-foreground">
                  Activé : seuls les comptes listés ci-dessous peuvent utiliser le MCP. Désactivé : tout utilisateur connecté peut l'utiliser.
                </p>
              </div>
              <Switch
                checked={config.mode === "allowlist"}
                onCheckedChange={(v) => persist({ ...config, mode: v ? "allowlist" : "all" })}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agents autorisés</CardTitle>
            <CardDescription>Recherchez le compte utilisé par l'agent (email ou nom), puis autorisez-le.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Nom de l'agent (ex: Hermès)" className="sm:max-w-[200px]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un compte par email…" />
            </div>
            {candidates.length > 0 && (
              <div className="border rounded-lg divide-y">
                {candidates.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name ?? "Sans nom"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Button size="sm" onClick={() => addAgent(u)} disabled={saving}>
                      <Plus className="w-4 h-4 mr-1" /> Autoriser
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {config.agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun agent autorisé pour le moment.
                {config.mode === "allowlist" && " Le serveur MCP refusera donc toutes les connexions."}
              </p>
            ) : (
              <div className="space-y-4">
                {config.agents.map((agent) => (
                  <div key={agent.user_id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{agent.label}</p>
                          <Badge variant={agent.enabled ? "default" : "secondary"}>{agent.enabled ? "Autorisé" : "Désautorisé"}</Badge>
                          {agent.allow_admin_tools && <Badge variant="destructive">Admin</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{nameOf(agent.user_id)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={agent.enabled} onCheckedChange={(v) => updateAgent(agent.user_id, { enabled: v })} disabled={saving} />
                        <Button variant="ghost" size="icon" onClick={() => removeAgent(agent.user_id)} disabled={saving}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                      <ShieldAlert className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Label className="text-sm">Outils d'administration</Label>
                        <p className="text-xs text-muted-foreground">
                          Permet à l'agent de consulter les utilisateurs, modérer la vitrine et attribuer des abonnements (nécessite aussi un rôle admin sur le compte).
                        </p>
                      </div>
                      <Switch
                        checked={agent.allow_admin_tools}
                        onCheckedChange={(v) => updateAgent(agent.user_id, { allow_admin_tools: v })}
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Permissions par outil</Label>
                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                        {TOOLS.map((t) => {
                          const blocked = agent.disabled_tools.includes(t.name);
                          return (
                            <label key={t.name} className="flex items-center justify-between gap-2 rounded-md border p-2">
                              <span className="text-xs">
                                {t.label}
                                {t.admin && <Badge variant="outline" className="ml-2 text-[10px]">admin</Badge>}
                                {t.write && <Badge variant="outline" className="ml-1 text-[10px]">écriture</Badge>}
                              </span>
                              <Switch
                                checked={!blocked}
                                disabled={saving}
                                onCheckedChange={(v) =>
                                  updateAgent(agent.user_id, {
                                    disabled_tools: v
                                      ? agent.disabled_tools.filter((x) => x !== t.name)
                                      : [...agent.disabled_tools, t.name],
                                  })
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outils désactivés globalement</CardTitle>
            <CardDescription>Bloque un outil pour tous les agents, quelles que soient leurs permissions.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            {TOOLS.map((t) => {
              const blocked = config.disabled_tools.includes(t.name);
              return (
                <label key={t.name} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <span className="text-xs">{t.label}</span>
                  <Switch
                    checked={!blocked}
                    disabled={saving}
                    onCheckedChange={(v) =>
                      persist({
                        ...config,
                        disabled_tools: v
                          ? config.disabled_tools.filter((x) => x !== t.name)
                          : [...config.disabled_tools, t.name],
                      })
                    }
                  />
                </label>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
