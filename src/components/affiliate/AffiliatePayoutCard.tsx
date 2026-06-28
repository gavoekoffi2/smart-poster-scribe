import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wallet, Loader2 } from "lucide-react";

export function AffiliatePayoutCard({ affiliateId }: { affiliateId: string }) {
  const [balance, setBalance] = useState<{ total_earned_usd: number; paid_usd: number; locked_usd: number; available_usd: number } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [details, setDetails] = useState({ provider: "", phone: "", iban: "", paypal_email: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data: bal } = await supabase.rpc("get_affiliate_balance", { p_affiliate_id: affiliateId });
    if (bal) setBalance(bal as any);
    const { data: h } = await supabase
      .from("affiliate_payout_requests")
      .select("id,amount_usd,status,payment_method,requested_at,processed_at")
      .eq("affiliate_id", affiliateId)
      .order("requested_at", { ascending: false })
      .limit(10);
    setHistory(h || []);
  };
  useEffect(() => { if (affiliateId) load(); }, [affiliateId]);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 5) return toast.error("Montant minimum : 5 $");
    if (balance && amt > balance.available_usd) return toast.error("Solde insuffisant");
    setSubmitting(true);
    const payload: any = { provider: details.provider, phone: details.phone };
    if (method === "bank") { payload.iban = details.iban; }
    if (method === "paypal") { payload.paypal_email = details.paypal_email; }
    const { data, error } = await supabase.functions.invoke("request-affiliate-payout", {
      body: { amount_usd: amt, payment_method: method, payment_details: payload },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Erreur");
      return;
    }
    toast.success("Demande envoyée ✓");
    setOpen(false); setAmount("");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" />Mes gains & retraits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Disponible" value={balance?.available_usd} highlight />
          <Stat label="En attente" value={balance?.locked_usd} />
          <Stat label="Déjà payé" value={balance?.paid_usd} />
          <Stat label="Total gagné" value={balance?.total_earned_usd} />
        </div>
        <Button onClick={() => setOpen(true)} disabled={!balance?.available_usd || balance.available_usd < 5}>
          Demander un retrait
        </Button>
        {history.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-sm mb-2">Historique</h4>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
                  <div>
                    <p className="font-medium">{h.amount_usd} $ — {h.payment_method}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.requested_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-muted">{h.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Demande de retrait</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Montant (USD)</Label>
              <Input type="number" min={5} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5" />
              <p className="text-xs text-muted-foreground mt-1">Disponible : {balance?.available_usd?.toFixed(2)} $</p>
            </div>
            <div>
              <Label>Méthode</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank">Virement bancaire</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {method === "mobile_money" && (
              <>
                <div><Label>Opérateur</Label><Input placeholder="MTN, Orange, Wave…" value={details.provider} onChange={(e) => setDetails({ ...details, provider: e.target.value })} /></div>
                <div><Label>Numéro</Label><Input placeholder="+228 ..." value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} /></div>
              </>
            )}
            {method === "bank" && <div><Label>IBAN</Label><Input value={details.iban} onChange={(e) => setDetails({ ...details, iban: e.target.value })} /></div>}
            {method === "paypal" && <div><Label>Email PayPal</Label><Input type="email" value={details.paypal_email} onChange={(e) => setDetails({ ...details, paypal_email: e.target.value })} /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer la demande"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "bg-primary/10 border-primary/30" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}>{(value || 0).toFixed(2)} $</p>
    </div>
  );
}
