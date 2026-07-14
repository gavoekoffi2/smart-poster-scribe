import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Copy, Tag, TrendingUp, Users } from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  applicable_plans: string[] | null;
  once_per_user: boolean;
  is_active: boolean;
  created_at: string;
};

type Redemption = {
  id: string;
  code: string;
  user_name: string | null;
  user_email: string | null;
  plan_slug: string | null;
  original_amount: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  currency: string | null;
  created_at: string;
};

const emptyForm = {
  code: "",
  description: "",
  discount_percent: 10,
  expires_at: "",
  max_uses: "",
  applicable_plans: "",
  once_per_user: true,
  is_active: true,
};

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [codesRes, redemRes] = await Promise.all([
      (supabase as any).from("promo_codes").select("*").order("created_at", { ascending: false }),
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return { data: [] };
        return (supabase as any).rpc("admin_list_promo_redemptions", { p_admin_id: user.id });
      }),
    ]);
    setCodes((codesRes.data as PromoCode[]) || []);
    setRedemptions((redemRes.data as Redemption[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: PromoCode) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_percent: c.discount_percent,
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      max_uses: c.max_uses?.toString() || "",
      applicable_plans: c.applicable_plans?.join(", ") || "",
      once_per_user: c.once_per_user,
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.code.trim()) { toast.error("Code requis"); return; }
    if (form.discount_percent < 1 || form.discount_percent > 100) { toast.error("Réduction entre 1 et 100"); return; }
    setSaving(true);
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discount_percent: form.discount_percent,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
      applicable_plans: form.applicable_plans.trim()
        ? form.applicable_plans.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      once_per_user: form.once_per_user,
      is_active: form.is_active,
    };
    let error;
    if (editing) {
      const res = await (supabase as any).from("promo_codes").update(payload).eq("id", editing.id);
      error = res.error;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      const res = await (supabase as any).from("promo_codes").insert(payload);
      error = res.error;
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Code mis à jour" : "Code créé");
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce code ? Toutes les utilisations passées seront aussi supprimées.")) return;
    const { error } = await (supabase as any).from("promo_codes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Code supprimé");
    load();
  };

  const toggleActive = async (c: PromoCode) => {
    const { error } = await (supabase as any).from("promo_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié");
  };

  const totalRedemptions = redemptions.length;
  const totalDiscount = redemptions.reduce((s, r) => s + (Number(r.discount_amount) || 0), 0);
  const uniqueUsers = new Set(redemptions.map((r) => r.user_email).filter(Boolean)).size;

  return (
    <AdminLayout requiredPermission="manage_users">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">Codes promo</h1>
            <p className="text-sm text-muted-foreground">Créez et gérez les codes de réduction pour les abonnements.</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nouveau code
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Tag className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Codes actifs</p><p className="text-2xl font-bold">{codes.filter(c => c.is_active).length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-accent" /></div>
            <div><p className="text-xs text-muted-foreground">Utilisations</p><p className="text-2xl font-bold">{totalRedemptions}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-green-500" /></div>
            <div><p className="text-xs text-muted-foreground">Utilisateurs uniques</p><p className="text-2xl font-bold">{uniqueUsers}</p></div>
          </CardContent></Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="codes">
            <TabsList>
              <TabsTrigger value="codes">Codes ({codes.length})</TabsTrigger>
              <TabsTrigger value="redemptions">Utilisations ({totalRedemptions})</TabsTrigger>
            </TabsList>

            <TabsContent value="codes" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Réduction</TableHead>
                      <TableHead>Utilisations</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Plans</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun code promo</TableCell></TableRow>
                    )}
                    {codes.map((c) => {
                      const expired = c.expires_at && new Date(c.expires_at) < new Date();
                      const maxed = c.max_uses !== null && c.uses_count >= c.max_uses;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="font-mono font-semibold">{c.code}</code>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyCode(c.code)}><Copy className="w-3 h-3" /></Button>
                            </div>
                            {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                          </TableCell>
                          <TableCell><Badge variant="secondary">-{c.discount_percent}%</Badge></TableCell>
                          <TableCell>
                            <span className="text-sm">{c.uses_count}{c.max_uses !== null && ` / ${c.max_uses}`}</span>
                            {maxed && <Badge variant="destructive" className="ml-2 text-xs">Épuisé</Badge>}
                          </TableCell>
                          <TableCell>
                            {c.expires_at ? (
                              <span className={`text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                                {new Date(c.expires_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                                {expired && " (expiré)"}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">Aucune</span>}
                          </TableCell>
                          <TableCell>
                            {c.applicable_plans?.length ? c.applicable_plans.map((p) => <Badge key={p} variant="outline" className="text-xs mr-1">{p}</Badge>) : <span className="text-xs text-muted-foreground">Tous</span>}
                          </TableCell>
                          <TableCell><Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} /></TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="redemptions" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Réduction</TableHead>
                      <TableHead>Payé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune utilisation</TableCell></TableRow>
                    )}
                    {redemptions.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                        <TableCell><code className="font-mono text-xs">{r.code}</code></TableCell>
                        <TableCell>
                          <div className="text-sm">{r.user_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.user_email}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{r.plan_slug || "—"}</Badge></TableCell>
                        <TableCell className="text-destructive">-{Number(r.discount_amount || 0).toLocaleString("fr-FR")} {r.currency}</TableCell>
                        <TableCell>{Number(r.final_amount || 0).toLocaleString("fr-FR")} {r.currency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier le code" : "Nouveau code promo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: WELCOME20" maxLength={40} />
            </div>
            <div className="space-y-2">
              <Label>Description (interne)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Campagne Facebook été 2026" rows={2} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Réduction (%) *</Label>
              <Input type="number" min={1} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: parseInt(e.target.value, 10) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Date d'expiration (optionnel)</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nombre max d'utilisations (optionnel)</Label>
              <Input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Illimité si vide" />
            </div>
            <div className="space-y-2">
              <Label>Plans ciblés (slugs séparés par virgule)</Label>
              <Input value={form.applicable_plans} onChange={(e) => setForm({ ...form, applicable_plans: e.target.value })} placeholder="Ex: pro, business (vide = tous)" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="once">1 utilisation par utilisateur</Label>
              <Switch id="once" checked={form.once_per_user} onCheckedChange={(v) => setForm({ ...form, once_per_user: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Actif</Label>
              <Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
