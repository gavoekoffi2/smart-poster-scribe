import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Setting = { key: string; value: any };

const KEYS = [
  { key: "designer_royalty_rate", label: "Taux de royalties graphistes", help: "Entre 0 et 1 (ex: 0.20 = 20%)", parse: (v: string) => parseFloat(v) },
  { key: "generation_unit_value_usd", label: "Valeur USD par génération", help: "Utilisée pour calculer la royalty", parse: (v: string) => parseFloat(v) },
  { key: "designer_payout_min_fcfa", label: "Seuil minimum de retrait (FCFA)", help: "Demande de payout refusée en dessous", parse: (v: string) => parseInt(v, 10) },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("platform_settings").select("key,value");
    const map: Record<string, any> = {};
    (data as Setting[] | null)?.forEach((s) => { map[s.key] = typeof s.value === "string" ? s.value.replace(/"/g, "") : s.value; });
    setSettings(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (key: string, raw: string, parse: (v: string) => any) => {
    setSaving(key);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let value: any = parse(raw);
    if (Number.isNaN(value)) { toast.error("Valeur invalide"); setSaving(null); return; }
    const { error } = await supabase.rpc("admin_set_platform_setting", { p_admin_id: user.id, p_key: key, p_value: value });
    if (error) toast.error(error.message); else toast.success("Sauvegardé");
    setSaving(null); load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Paramètres plateforme</h1>
        <Card>
          <CardHeader>
            <CardTitle>Royalties & paiements</CardTitle>
            <CardDescription>Modifiables à la volée. Effet immédiat sur les prochaines générations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {KEYS.map((k) => {
              const value = settings[k.key];
              return (
                <SettingRow key={k.key} k={k} initial={value} onSave={save} saving={saving === k.key} />
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({ k, initial, onSave, saving }: { k: any; initial: any; onSave: any; saving: boolean }) {
  const [v, setV] = useState(initial != null ? String(initial) : "");
  useEffect(() => { setV(initial != null ? String(initial) : ""); }, [initial]);
  return (
    <div>
      <Label className="text-sm font-medium">{k.label}</Label>
      <p className="text-xs text-muted-foreground mb-2">{k.help}</p>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} className="max-w-xs" />
        <Button onClick={() => onSave(k.key, v, k.parse)} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
