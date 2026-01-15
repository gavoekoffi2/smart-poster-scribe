import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Send, Sparkles } from "lucide-react";

interface FeedbackModalProps {
  imageId?: string;
  onClose: () => void;
}

const EMOJI_RATINGS = [
  { emoji: "😞", label: "Très déçu", value: 1 },
  { emoji: "😕", label: "Déçu", value: 2 },
  { emoji: "😐", label: "Neutre", value: 3 },
  { emoji: "😊", label: "Satisfait", value: 4 },
  { emoji: "🤩", label: "Excellent", value: 5 },
];

export function FeedbackModal({ imageId, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === null) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Save feedback to database using raw SQL through RPC to avoid type issues
      const { error } = await supabase.rpc('submit_generation_feedback' as never, {
        p_user_id: user?.id || null,
        p_image_id: imageId || null,
        p_rating: rating,
        p_comment: comment.trim() || null,
      } as never);

      if (error) throw error;

      setSubmitted(true);
      toast.success("Merci pour votre feedback !");
      
      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      toast.error("Erreur lors de l'envoi du feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-md p-8 rounded-3xl bg-card border border-border/40 shadow-2xl text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Merci ! 🎉</h3>
          <p className="text-muted-foreground">
            Votre feedback nous aide à améliorer Graphiste GPT
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-card border border-border/40 shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Votre avis compte</span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-1">
            Qu'en pensez-vous ?
          </h3>
          <p className="text-sm text-muted-foreground">
            Votre feedback nous aide à nous améliorer
          </p>
        </div>

        {/* Emoji Rating */}
        <div className="flex justify-center gap-3 mb-6">
          {EMOJI_RATINGS.map(({ emoji, label, value }) => (
            <button
              key={value}
              onClick={() => setRating(value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
                rating === value
                  ? "bg-primary/20 border-2 border-primary scale-110"
                  : "hover:bg-muted/50 border-2 border-transparent hover:scale-105"
              }`}
              title={label}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>

        {/* Comment (optional) */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">
            Un commentaire ? (optionnel)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Dites-nous ce que vous aimeriez voir amélioré..."
            className="bg-background/60 border-border/50 resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex-1"
            disabled={isSubmitting}
          >
            Passer
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === null}
            className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Envoi...</span>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
