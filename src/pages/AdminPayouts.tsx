import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

type Row = {
  id: string;
  amount_usd: number;
  amount_fcfa: number;
  status: string;
  payment_method: string;
  payment_details: any;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
  designer_name?: string;
  designer_id?: string;
  affiliate_name?: string;
  affiliate_email?: string;
  affiliate_id?: string;
};

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    approved: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    paid: "bg-green-500/15 text-green-600 border-green-500/30",
    rejected: "bg-red-500/15 text-red-600 border-red-500/30",
  };
  return <Badge variant="outline" className={map[s] || ""}>{s}</Badge>;
}

function PayoutTable({ kind }: { kind: "designer" | "affiliate" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rpc = kind === "designer" ? "admin_list_designer_payouts" : "admin_list_affiliate_payouts";
    const { data, error } = await supabase.rpc(rpc, { p_admin_id: user.id });
    if (error) toast.error(error.message); else setRows((data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [kind]);

  const updateStatus = async (status: string) => {
    if (!selected) return;
    const table = kind === "designer" ? "designer_payout_requests" : "affiliate_payout_requests";
    const { error } = await supabase.from(table as any).update({
      status, admin_note: note || selected.admin_note, processed_at: new Date().toISOString(),
    }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour");
    setSelected(null); setNote("");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!rows.length) return <p className="text-center py-12 text-muted-foreground">Aucune demande pour l'instant</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Demandeur</th>
              <th>Montant</th>
              <th>Méthode</th>
              <th>Statut</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b hover:bg-muted/30">
                <td className="py-3">
                  {kind === "designer" ? r.designer_name : `${r.affiliate_name || ""} ${r.affiliate_email ? `(${r.affiliate_email})` : ""}`}
                </td>
                <td>{r.amount_usd} $ <span className="text-xs text-muted-foreground">({r.amount_fcfa} F)</span></td>
                <td className="capitalize">{r.payment_method}</td>
                <td><StatusBadge s={r.status} /></td>
                <td className="text-xs">{new Date(r.requested_at).toLocaleDateString()}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => { setSelected(r); setNote(r.admin_note || ""); }}>
                    Gérer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Demande de retrait</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Montant :</span> <b>{selected.amount_usd} $</b></div>
                <div><span className="text-muted-foreground">~ FCFA :</span> {selected.amount_fcfa}</div>
                <div><span className="text-muted-foreground">Méthode :</span> {selected.payment_method}</div>
                <div><span className="text-muted-foreground">Statut :</span> <StatusBadge s={selected.status} /></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Détails de paiement</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">{JSON.stringify(selected.payment_details, null, 2)}</pre>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Note interne (référence transaction, motif…)</p>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => updateStatus("rejected")}>Rejeter</Button>
            <Button variant="outline" onClick={() => updateStatus("approved")}>Approuver</Button>
            <Button onClick={() => updateStatus("paid")}>Marquer payé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminPayouts() {
  return (
    <AdminLayout requiredPermission="manage_users">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Demandes de retrait</h1>
        <Card>
          <CardHeader><CardTitle>Gestion des paiements</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="designers">
              <TabsList>
                <TabsTrigger value="designers">Graphistes</TabsTrigger>
                <TabsTrigger value="affiliates">Affiliés</TabsTrigger>
              </TabsList>
              <TabsContent value="designers" className="mt-4"><PayoutTable kind="designer" /></TabsContent>
              <TabsContent value="affiliates" className="mt-4"><PayoutTable kind="affiliate" /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
