import { useEffect, useRef } from "react";
import { X, Play } from "lucide-react";
import demoAsset from "@/assets/demo.mp4.asset.json";

interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // autoplay
    setTimeout(() => videoRef.current?.play().catch(() => {}), 400);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Backdrop with animated gradient blur */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/30 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/30 blur-[120px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
      </div>

      {/* Modal content */}
      <div
        className="relative z-10 w-full max-w-5xl animate-in zoom-in-95 fade-in slide-in-from-bottom-8 duration-500"
        style={{ perspective: "1200px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing gradient border */}
        <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-primary via-accent to-primary shadow-2xl shadow-primary/50">
          {/* Animated shine */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer pointer-events-none" />

          <div className="relative rounded-[calc(1.5rem-2px)] overflow-hidden bg-card">
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-card/50 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/40">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
                <div>
                  <p className="font-display font-bold text-foreground leading-tight">Demo GraphisteGPT</p>
                  <p className="text-xs text-muted-foreground">Découvrez la plateforme en action</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="group relative w-10 h-10 rounded-full bg-secondary/80 hover:bg-primary/20 border border-border/60 hover:border-primary/60 transition-all duration-300 flex items-center justify-center hover:scale-110 hover:rotate-90"
              >
                <X className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>

            {/* Video */}
            <div className="relative bg-black aspect-video">
              <video
                ref={videoRef}
                src={demoAsset.url}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
              {/* Corner accents */}
              <div className="pointer-events-none absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary/70 rounded-tl-lg" />
              <div className="pointer-events-none absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/70 rounded-tr-lg" />
              <div className="pointer-events-none absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/70 rounded-bl-lg" />
              <div className="pointer-events-none absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary/70 rounded-br-lg" />
            </div>
          </div>
        </div>

        {/* Floating dots decoration */}
        <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-primary/60 blur-md animate-float" />
        <div className="absolute -bottom-4 -right-4 w-10 h-10 rounded-full bg-accent/60 blur-md animate-float" style={{ animationDelay: "0.8s" }} />
      </div>
    </div>
  );
}
