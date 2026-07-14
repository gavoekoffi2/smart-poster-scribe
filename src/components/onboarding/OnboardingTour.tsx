import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, CreditCard, Share2 } from "lucide-react";

const ICONS = [Sparkles, Wand2, CreditCard, Share2];
const KEY = "ggpt_onboarding_seen_v1";

export function OnboardingTour() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const rawSteps = t("onboarding.steps", { returnObjects: true }) as Array<{ title: string; body: string }>;
  const steps = Array.isArray(rawSteps) ? rawSteps : [];
  if (steps.length === 0) return null;
  const cur = steps[step];
  const Icon = ICONS[step] || Sparkles;

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
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="ghost" onClick={close}>{t("onboarding.skip")}</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>{t("onboarding.next")}</Button>
          ) : (
            <Button onClick={close}>{t("onboarding.letsGo")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
