import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { MessageCircle, CreditCard, Loader2 } from "lucide-react";

// Numéro WhatsApp destinataire des demandes d'abonnement
const WHATSAPP_NUMBER = "22893708178";

interface SubscriptionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planSlug: string;
  planPrice?: string;
}

export function SubscriptionRequestModal({
  open,
  onOpenChange,
  planName,
  planSlug,
  planPrice,
}: SubscriptionRequestModalProps) {
  const { user } = useAuth();
  const { openGeniusPayCheckout } = useSubscription();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayingOnline, setIsPayingOnline] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      // Enregistrer la demande pour le suivi admin (best-effort)
      if (user) {
        await supabase.from("subscription_requests").insert({
          user_id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          plan_slug: planSlug,
        });
      }

      // Construire le message WhatsApp pré-rempli
      const priceLine = planPrice ? `\nTarif: ${planPrice}` : "";
      const message = `Bonjour, je souhaite souscrire au plan *${planName}* de Graphiste GPT.\n\nNom: ${fullName.trim()}\nTéléphone: ${phone.trim()}${priceLine}\n\nMerci de me communiquer les instructions de paiement.`;
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Redirection vers WhatsApp...");
      handleClose();
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error("Erreur. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFullName("");
      setPhone("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Souscrire au plan {planName}</DialogTitle>
          <DialogDescription>
            Remplissez vos coordonnées. Vous serez ensuite redirigé vers WhatsApp pour
            finaliser votre abonnement avec notre équipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="plan-display">Plan choisi</Label>
            <Input
              id="plan-display"
              value={planPrice ? `${planName} — ${planPrice}` : planName}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full-name">Nom complet</Label>
            <Input
              id="full-name"
              placeholder="Ex: Jean Dupont"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Ex: +228 90 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={20}
            />
          </div>

          <Button
            type="button"
            onClick={async () => {
              if (!fullName.trim() || !phone.trim()) {
                toast.error("Renseignez votre nom et téléphone");
                return;
              }
              setIsPayingOnline(true);
              try {
                await openGeniusPayCheckout(planSlug, {
                  customerName: fullName.trim(),
                  customerPhone: phone.trim(),
                });
              } catch (err) {
                console.error(err);
                toast.error(err instanceof Error ? err.message : "Erreur paiement");
                setIsPayingOnline(false);
              }
            }}
            disabled={isPayingOnline || isSubmitting || !fullName.trim() || !phone.trim()}
            className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            {isPayingOnline ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            {isPayingOnline ? "Redirection..." : "Payer en ligne (Wave, Orange, MTN, Carte)"}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isPayingOnline || !fullName.trim() || !phone.trim()}
            variant="outline"
            className="w-full gap-2"
          >
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            {isSubmitting ? "Envoi..." : "Activation manuelle via WhatsApp"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Paiement en ligne sécurisé via GeniusPay, ou activation manuelle via WhatsApp.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
