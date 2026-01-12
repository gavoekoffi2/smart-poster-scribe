import { useState, useCallback } from "react";
import { GenerationParams, GeneratedImage, GenerationResult } from "@/types/generation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreditError {
  error: string;
  message: string;
  remaining?: number;
  needed?: number;
  is_free?: boolean;
}

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [creditError, setCreditError] = useState<CreditError | null>(null);

  const generateImage = useCallback(async (params: GenerationParams) => {
    setIsGenerating(true);
    setCreditError(null);

    try {
      const { data, error } = await supabase.functions.invoke<GenerationResult>("generate-image", {
        body: {
          prompt: params.prompt,
          aspectRatio: params.aspectRatio,
          resolution: params.resolution,
          outputFormat: params.outputFormat,
          referenceImage: params.referenceImageUrl,
          contentImage: params.contentImageUrl,
          ...(params as Record<string, unknown>),
        },
      });

      if (error) {
        console.error("Function invocation error:", error);
        
        // Vérifier si c'est une erreur de crédits (402) ou d'authentification (401)
        if (error.message?.includes("402") || error.message?.includes("Payment Required")) {
          const errorData = data as unknown as CreditError;
          setCreditError(errorData || { error: "INSUFFICIENT_CREDITS", message: "Crédits insuffisants" });
          toast.error(errorData?.message || "Crédits insuffisants pour cette génération");
          return null;
        }
        
        if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
          setCreditError({ error: "AUTHENTICATION_REQUIRED", message: "Veuillez vous connecter" });
          toast.error("Veuillez vous connecter pour générer des images");
          return null;
        }
        
        toast.error("Erreur lors de la génération de l'image");
        return null;
      }

      // Vérifier si la réponse contient une erreur de crédits
      if (data && !data.success) {
        const errorData = data as unknown as CreditError;
        if (errorData.error === "INSUFFICIENT_CREDITS" || 
            errorData.error === "FREE_LIMIT_REACHED" ||
            errorData.error === "RESOLUTION_NOT_ALLOWED" ||
            errorData.error === "AUTHENTICATION_REQUIRED") {
          setCreditError(errorData);
          toast.error(errorData.message);
          return null;
        }
        
        toast.error(data.error || "La génération a échoué");
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

  const clearCreditError = useCallback(() => {
    setCreditError(null);
  }, []);

  return {
    isGenerating,
    currentImage,
    history,
    creditError,
    generateImage,
    selectFromHistory,
    clearHistory,
    clearCreditError,
  };
}

