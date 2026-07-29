import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/credits/UpgradeModal";

const DISMISS_KEY = "subscribeFabDismissedAt";
const DISMISS_DURATION_MS = 6 * 60 * 60 * 1000; // 6h

export function SubscribeFloatingButton() {
  const { user } = useAuth();
  const { subscription, isLoading } = useSubscription();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (t && Date.now() - t < DISMISS_DURATION_MS) setDismissed(true);
  }, []);

  // Hide on admin/designer/auth/onboarding pages
  const hiddenRoutes = ["/auth", "/onboarding", "/admin", "/designer", "/.lovable"];
  const isHidden = hiddenRoutes.some((r) => location.pathname.startsWith(r));

  if (isHidden || isLoading || !user || dismissed) return null;

  // Show only for users without an active paid plan
  const planSlug = subscription?.plan?.slug;
  const isPaidActive =
    subscription?.status === "active" && planSlug && planSlug !== "free";
  if (isPaidActive) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <>
      <button
        onClick={() => setOpenModal(true)}
        aria-label="S'abonner avec -20%"
        className="fixed bottom-24 right-5 z-[60] group animate-fade-up"
      >
        <span className="absolute inset-0 rounded-full bg-primary/40 blur-xl animate-pulse" />
        <span className="relative flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-2xl shadow-primary/40 hover:scale-105 transition-transform font-semibold">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm">S'abonner</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold">
            -20%
          </span>
        </span>
        <span
          onClick={handleDismiss}
          role="button"
          aria-label="Masquer"
          className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow"
        >
          <X className="w-3 h-3" />
        </span>
      </button>

      <UpgradeModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        creditError={{
          error: "promo",
          message: "Débloquez toutes les fonctionnalités avec -20% pendant 30 minutes.",
          is_free: !subscription || planSlug === "free",
        }}
      />
    </>
  );
}
