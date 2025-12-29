import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Loader2 } from "lucide-react";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

const promptSuggestions = [
  "Affiche concert rock néon avec guitare électrique et effets lumineux",
  "Poster film action avec héros silhouette contre explosion",
  "Flyer événement tech futuriste avec hologrammes et grille néon",
  "Affiche festival musique électronique style cyberpunk",
];

export function PromptInput({ onGenerate, isGenerating }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez l'affiche que vous souhaitez créer..."
            className="min-h-[120px] bg-card/50 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground pr-4"
            disabled={isGenerating}
          />
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {prompt.length} / 20000
          </div>
        </div>

        <Button
          type="submit"
          size="xl"
          className="w-full font-display text-lg tracking-wider"
          disabled={!prompt.trim() || isGenerating}
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
          <span>Suggestions de prompts</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {promptSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors border border-border/30"
              disabled={isGenerating}
            >
              {suggestion.length > 40
                ? suggestion.substring(0, 40) + "..."
                : suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
