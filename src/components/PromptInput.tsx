import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Loader2, AlertCircle } from "lucide-react";
import { Domain } from "@/types/generation";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  canGenerate: boolean;
  missingRequirements?: string[];
}

const promptSuggestions = [
  "Affiche concert rock néon avec guitare électrique",
  "Poster film action avec héros en silhouette",
  "Flyer tech futuriste avec hologrammes",
  "Affiche festival électronique cyberpunk",
];

export function PromptInput({ onGenerate, isGenerating, canGenerate, missingRequirements = [] }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating && canGenerate) {
      onGenerate(prompt.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const isDisabled = !prompt.trim() || isGenerating || !canGenerate;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez le contenu de votre affiche : textes, message, éléments à inclure..."
            className="min-h-[100px] bg-card/50 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground pr-4"
            disabled={isGenerating}
          />
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {prompt.length} / 20000
          </div>
        </div>

        {missingRequirements.length > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-xs text-destructive">
              <span className="font-medium">Éléments manquants : </span>
              {missingRequirements.join(", ")}
            </div>
          </div>
        )}

        <Button
          type="submit"
          size="xl"
          className="w-full font-display text-lg tracking-wider"
          disabled={isDisabled}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              GÉNÉRATION EN COURS...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              GÉNÉRER L'AFFICHE
            </>
          )}
        </Button>
      </form>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>Suggestions</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {promptSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors border border-border/30"
              disabled={isGenerating}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
