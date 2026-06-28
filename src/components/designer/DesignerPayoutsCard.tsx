import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wallet, Send, Clock, Check, X } from "lucide-react";
import { toast } from "sonner";

// 1 USD ≈ 600 FCFA (approximation pour seuil + conversion)
const USD_TO_FCFA = 600;
const DEFAULT_THRESHOLD_FCFA = 10000;

interface Balance {
  total_earned_usd: number;
  paid_usd: number;
  locked_usd: number;
  available_usd: number;
}

interface PayoutRequest {
  id: string;
  amount_usd: number;
  amount_fcfa: number;
  status: "pending" | "approved" | "paid" | "rejected";
  payment_method: string;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
}

interface Props {
  designerId: string;
}

export function DesignerPayoutsCard({ designerId }: Props) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [thresholdFcfa, setThresholdFcfa] = useState<number>(DEFAULT_THRESHOLD_FCFA);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [method, setMethod] = useState("mobile_money");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [operator, setOperator] = useState("");
  const [note, setNote] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      const [{ data: bal }, { data: thr }, { data: list }] = await Promise.all([
        supabase.rpc("get_designer_balance", { p_designer_id: designerId }),
        supabase.from("platform_settings").select("value").eq("key", "designer_payout_threshold_fcfa").maybeSingle(),
        supabase.from("designer_payout_requests").select("*").eq("designer_id", designerId).order("requested_at", { ascending: false }),
      ]);
      setBalance((bal as unknown as Balance) ?? null);
      if (thr?.value !== undefined && thr?.value !== null) {
        setThresholdFcfa(Number(thr.value) || DEFAULT_THRESHOLD_FCFA);
      }
      setRequests((list as PayoutRequest[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (designerId) void reload();
  }, [designerId]);

  const availableUsd = balance?.available_usd || 0;
  const availableFcfa = Math.floor(availableUsd * USD_TO_FCFA);
  const canRequest = availableFcfa >= thresholdFcfa;

  const submitRequest = async () => {
    if (!canRequest) return;
    if (!accountName.trim() || !accountNumber.trim()) {
      toast.error("Renseignez le nom et le numéro du compte");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("designer_payout_requests").insert({
        designer_id: designerId,
        amount_usd: Number(availableUsd.toFixed(4)),
        amount_fcfa: availableFcfa,
        payment_method: method,
        payment_details: {
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
          operator: operator || null,
          note: note.trim() || null,
        },
        status: "pending",
      });
      if (error) throw error;
      toast.success("Demande de paiement envoyée");
      setOpen(false);
      setAccountName(""); setAccountNumber(""); setOperator(""); setNote("");
      void reload();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s: PayoutRequest["status"]) => {
    const map: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
      pending:  { label: "En attente", cls: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30", Icon: Clock },
      approved: { label: "Approuvée", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", Icon: Check },
      paid:     { label: "Payée",     cls: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30", Icon: Check },
      rejected: { label: "Rejetée",   cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", Icon: X },
    };
    const { label, cls, Icon } = map[s];
    return <Badge variant="outline" className={cls}><Icon className="h-3 w-3 mr-1" />{label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Mes gains & retraits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Disponible</p>
            <p className="text-xl font-bold">{availableUsd.toFixed(2)} $</p>
            <p className="text-xs text-muted-foreground">≈ {availableFcfa.toLocaleString("fr-FR")} FCFA</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">En cours de paiement</p>
            <p className="text-xl font-bold">{(balance?.locked_usd || 0).toFixed(2)} $</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Déjà payé</p>
            <p className="text-xl font-bold">{(balance?.paid_usd || 0).toFixed(2)} $</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Seuil minimum de retrait : <strong>{thresholdFcfa.toLocaleString("fr-FR")} FCFA</strong>
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canRequest || loading}>
                <Send className="h-4 w-4 mr-2" />
                Demander un paiement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Demande de paiement</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted p-3 text-sm">
                  Montant : <strong>{availableUsd.toFixed(2)} $</strong> (≈ {availableFcfa.toLocaleString("fr-FR")} FCFA)
                </div>
                <div className="grid gap-2">
                  <Label>Méthode de paiement</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {method === "mobile_money" && (
                  <div className="grid gap-2">
                    <Label>Opérateur</Label>
                    <Input placeholder="MTN, Orange, Wave, Moov…" value={operator} onChange={(e) => setOperator(e.target.value)} />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Nom du titulaire</Label>
                  <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{method === "paypal" ? "Email PayPal" : "Numéro de compte"}</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Note (facultatif)</Label>
                  <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={submitRequest} disabled={submitting}>
                  {submitting ? "Envoi…" : "Envoyer la demande"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {requests.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Historique</p>
            <div className="divide-y rounded-lg border">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium">{r.amount_fcfa.toLocaleString("fr-FR")} FCFA <span className="text-muted-foreground font-normal">({r.amount_usd.toFixed(2)} $)</span></p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.requested_at).toLocaleDateString("fr-FR")} • {r.payment_method.replace("_", " ")}
                      {r.admin_note ? ` • ${r.admin_note}` : ""}
                    </p>
                  </div>
                  {statusBadge(r.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
