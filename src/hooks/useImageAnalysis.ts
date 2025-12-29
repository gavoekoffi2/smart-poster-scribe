import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageAnalysisResult } from "@/types/generation";

export function useImageAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceDescription, setReferenceDescription] = useState<string | null>(null);

  const uploadImage = useCallback((imageDataUrl: string) => {
    setReferenceImage(imageDataUrl);
    setReferenceDescription(null);
  }, []);

  const removeImage = useCallback(() => {
    setReferenceImage(null);
    setReferenceDescription(null);
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!referenceImage) {
      toast.error("Aucune image à analyser");
      return null;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke<ImageAnalysisResult>("analyze-image", {
        body: {
          imageData: referenceImage,
        },
      });

      if (error) {
        console.error("Function invocation error:", error);
        toast.error("Erreur lors de l'analyse de l'image");
        return null;
      }

      if (!data?.success || !data.description) {
        console.error("Analysis failed:", data);
        toast.error(data?.error || "L'analyse a échoué");
        return null;
      }

      setReferenceDescription(data.description);
      toast.success("Image analysée avec succès!");

      return data.description;
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Une erreur inattendue s'est produite");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [referenceImage]);

  return {
    isAnalyzing,
    referenceImage,
    referenceDescription,
    uploadImage,
    removeImage,
    analyzeImage,
  };
}
