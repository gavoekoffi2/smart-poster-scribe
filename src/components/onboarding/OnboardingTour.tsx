import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, CreditCard, Share2 } from "lucide-react";

const STEPS = [
  { icon: Sparkles, title: "Bienvenue 👋", body: "Graphiste GPT crée des affiches pros en quelques secondes grâce à l'IA et à nos templates de graphistes." },
  { icon: Wand2, title: "1. Décrivez votre besoin", body: "Tapez une demande (ex : « Affiche église dimanche, thème espoir »). L'IA détecte le bon template." },
  { icon: CreditCard, title: "2. Vos crédits", body: "Chaque génération consomme 1 crédit. Vous démarrez avec 3 crédits offerts. Passez à un plan pour générer en illimité." },
  { icon: Share2, title: "3. Parrainez & gagnez", body: "Partagez votre lien d'affiliation et gagnez 30% de commission sur chaque abonnement filleul." },
];

const KEY = "ggpt_onboarding_seen_v1";

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const cur = STEPS[step];
  const Icon = cur.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center">{cur.title}</DialogTitle>
          <DialogDescription className="text-center pt-2">{cur.body}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="ghost" onClick={close}>Passer</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Suivant</Button>
          ) : (
            <Button onClick={close}>C'est parti ✨</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
