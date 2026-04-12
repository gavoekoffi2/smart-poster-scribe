import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Send, CheckCircle } from "lucide-react";

interface SubscriptionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planSlug: string;
}

export function SubscriptionRequestModal({ open, onOpenChange, planName, planSlug }: SubscriptionRequestModalProps) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fullName.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("subscription_requests")
        .insert({
          user_id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          plan_slug: planSlug,
        });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Demande envoyée avec succès !");
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setIsSuccess(false);
      setFullName("");
      setPhone("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isSuccess ? "Demande envoyée ✅" : `Souscrire au plan ${planName}`}
          </DialogTitle>
          <DialogDescription>
            {isSuccess
              ? "Nous avons bien reçu votre demande. Nous allons vérifier et activer votre compte après votre paiement."
              : "Remplissez le formulaire ci-dessous. Après vérification et paiement, nous activerons votre abonnement."}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center py-6 gap-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-center text-sm text-muted-foreground">
              Vous serez contacté pour finaliser le paiement et l'activation de votre plan <strong>{planName}</strong>.
            </p>
            <Button onClick={handleClose} className="w-full">Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="plan-display">Plan choisi</Label>
              <Input id="plan-display" value={planName} disabled className="bg-muted" />
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
                placeholder="Ex: +229 97 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={20}
              />
            </div>

            <Button type="submit" disabled={isSubmitting || !fullName.trim() || !phone.trim()} className="w-full gap-2">
              {isSubmitting ? "Envoi en cours..." : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer la demande
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Après envoi, nous vérifierons votre demande et activerons votre compte après paiement.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
