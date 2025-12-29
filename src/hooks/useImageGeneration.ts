import { useState, useCallback } from "react";
import { GenerationParams, GeneratedImage, GenerationResult } from "@/types/generation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  const generateImage = useCallback(async (params: GenerationParams) => {
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke<GenerationResult>("generate-image", {
        body: {
          prompt: params.prompt,
          aspectRatio: params.aspectRatio,
          resolution: params.resolution,
          outputFormat: params.outputFormat,
        },
      });

      if (error) {
        console.error("Function invocation error:", error);
        toast.error("Erreur lors de la génération de l'image");
        return null;
      }

      if (!data?.success || !data.imageUrl) {
        console.error("Generation failed:", data);
        toast.error(data?.error || "La génération a échoué");
        return null;
      }

      const newImage: GeneratedImage = {
        id: data.taskId || crypto.randomUUID(),
        imageUrl: data.imageUrl,
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        resolution: params.resolution,
        createdAt: new Date(),
      };

      setCurrentImage(newImage);
      setHistory((prev) => [newImage, ...prev]);
      toast.success("Image générée avec succès!");

      return newImage;
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Une erreur inattendue s'est produite");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const selectFromHistory = useCallback((image: GeneratedImage) => {
    setCurrentImage(image);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentImage(null);
  }, []);

  return {
    isGenerating,
    currentImage,
    history,
    generateImage,
    selectFromHistory,
    clearHistory,
  };
}
