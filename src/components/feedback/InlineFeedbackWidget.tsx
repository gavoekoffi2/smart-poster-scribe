import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface InlineFeedbackWidgetProps {
  imageId?: string;
  onFeedbackSubmitted?: () => void;
}

const EMOJI_RATINGS = [
  { emoji: "😞", label: "Très déçu", value: 1, color: "from-red-500/20 to-red-600/20" },
  { emoji: "😕", label: "Déçu", value: 2, color: "from-orange-500/20 to-orange-600/20" },
  { emoji: "😐", label: "Neutre", value: 3, color: "from-yellow-500/20 to-yellow-600/20" },
  { emoji: "😊", label: "Satisfait", value: 4, color: "from-green-500/20 to-green-600/20" },
  { emoji: "🤩", label: "Excellent", value: 5, color: "from-primary/20 to-accent/20" },
];

export function InlineFeedbackWidget({ imageId, onFeedbackSubmitted }: InlineFeedbackWidgetProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const handleRatingSelect = (value: number) => {
    setRating(value);
    // Auto-show comment for lower ratings
    if (value <= 3) {
      setShowComment(true);
    }
  };

  const handleSubmit = async () => {
    if (rating === null) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('submit_generation_feedback' as never, {
        p_user_id: user?.id || null,
        p_image_id: imageId || null,
        p_rating: rating,
        p_comment: comment.trim() || null,
      } as never);

      if (error) throw error;

      setSubmitted(true);
      toast.success("Merci pour votre feedback !");
      onFeedbackSubmitted?.();
    } catch (err) {
      console.error("Error submitting feedback:", err);
      toast.error("Erreur lors de l'envoi du feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-4 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center animate-bounce-slow">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Merci ! 🎉</p>
            <p className="text-xs text-muted-foreground">Votre avis nous aide à nous améliorer</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm">✨</span>
          </div>
          <p className="text-sm font-medium text-foreground">Qu'en pensez-vous ?</p>
        </div>
      </div>

      {/* Emoji Rating */}
      <div className="p-4">
        <div className="flex justify-center gap-2 mb-4">
          {EMOJI_RATINGS.map(({ emoji, label, value, color }) => (
            <button
              key={value}
              onClick={() => handleRatingSelect(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(null)}
              className={cn(
                "relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300",
                "hover:scale-110 active:scale-95",
                rating === value
                  ? `bg-gradient-to-br ${color} border-2 border-primary shadow-lg shadow-primary/20 scale-110`
                  : "hover:bg-muted/50 border-2 border-transparent"
              )}
              title={label}
            >
              <span 
                className={cn(
                  "text-2xl sm:text-3xl transition-transform duration-300",
                  (rating === value || hoveredRating === value) && "animate-bounce-slow"
                )}
              >
                {emoji}
              </span>
              <span className={cn(
                "text-[9px] sm:text-[10px] transition-opacity duration-200",
                rating === value ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {label}
              </span>
              
              {/* Selection indicator */}
              {rating === value && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Comment toggle */}
        {rating !== null && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => setShowComment(!showComment)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{showComment ? "Masquer le commentaire" : "Ajouter un commentaire (optionnel)"}</span>
              {showComment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showComment && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez vos suggestions d'amélioration..."
                  className="bg-background/60 border-border/50 resize-none text-sm"
                  rows={2}
                />
              </div>
            )}

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              size="sm"
              className="w-full mt-3 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Envoi...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer mon avis
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
