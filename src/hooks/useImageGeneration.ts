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
      // Rafraîchir la session avant l'appel pour éviter les tokens expirés
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.log("Session refresh warning:", refreshError.message);
      }
      
      const { data, error } = await supabase.functions.invoke<GenerationResult>("generate-image", {
        body: {
          prompt: params.prompt,
          aspectRatio: params.aspectRatio,
          resolution: params.resolution,
          outputFormat: params.outputFormat,
          referenceImage: params.referenceImageUrl,
          contentImage: params.contentImageUrl,
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

      // Async job pattern: edge function returns { success, jobId, status: 'processing' }
      const jobId = (data as any)?.jobId;
      if (!jobId) {
        // Backward compat: direct imageUrl response
        if (!data?.imageUrl) {
          console.error("Generation failed (no jobId/imageUrl):", data);
          toast.error(data?.error || "La génération a échoué");
          return null;
        }
      }

      // Poll image_jobs table until completed/failed (max ~8 minutes)
      let finalImageUrl: string | undefined = data?.imageUrl;
      let finalTaskId: string | undefined = data?.taskId;

      if (jobId) {
        const maxAttempts = 160; // 160 * 3s = 480s
        const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
        for (let i = 0; i < maxAttempts; i++) {
          await delay(3000);
          const { data: job, error: jobErr } = await supabase
            .from("image_jobs")
            .select("status, result_url, task_id, error_message")
            .eq("id", jobId)
            .maybeSingle();
          if (jobErr) {
            console.warn("Job poll error:", jobErr.message);
            continue;
          }
          if (!job) continue;
          if (job.status === "completed" && job.result_url) {
            finalImageUrl = job.result_url;
            finalTaskId = job.task_id || jobId;
            break;
          }
          if (job.status === "failed") {
            toast.error(job.error_message || "La génération a échoué");
            return null;
          }
        }
        if (!finalImageUrl) {
          toast.error("La génération prend plus de temps que prévu. Réessayez dans un instant.");
          return null;
        }
      }

      const newImage: GeneratedImage = {
        id: finalTaskId || crypto.randomUUID(),
        imageUrl: finalImageUrl!,
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

