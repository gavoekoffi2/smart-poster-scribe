import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExtractedTextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  fontSize?: number;
  color?: string;
}

export function useAITextExtraction() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textBlocks, setTextBlocks] = useState<ExtractedTextBlock[]>([]);

  const extractTextFromImage = useCallback(async (imageUrl: string): Promise<ExtractedTextBlock[]> => {
    setIsProcessing(true);
    setProgress(10);
    setTextBlocks([]);

    try {
      console.log("Starting AI text extraction for:", imageUrl);
      
      // Convert image URL to base64 if needed
      let imageData = imageUrl;
      
      if (!imageUrl.startsWith("data:")) {
        setProgress(20);
        // Fetch image and convert to base64
        try {
          const response = await fetch(imageUrl, { mode: "cors" });
          const blob = await response.blob();
          imageData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fetchError) {
          console.error("Failed to fetch image:", fetchError);
          toast.error("Impossible de charger l'image pour l'extraction");
          setIsProcessing(false);
          return [];
        }
      }

      setProgress(40);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("extract-text", {
        body: { imageData }
      });

      setProgress(80);

      if (error) {
        console.error("Extract text function error:", error);
        toast.error("Erreur lors de l'extraction du texte");
        setIsProcessing(false);
        return [];
      }

      if (!data?.success || !data?.textBlocks) {
        console.error("No text blocks in response:", data);
        toast.info("Aucun texte détecté sur l'image");
        setIsProcessing(false);
        setProgress(100);
        return [];
      }

      const blocks = data.textBlocks as ExtractedTextBlock[];
      setTextBlocks(blocks);
      setProgress(100);
      setIsProcessing(false);

      if (blocks.length > 0) {
        toast.success(`${blocks.length} texte(s) détecté(s) !`);
      } else {
        toast.info("Aucun texte détecté sur l'image");
      }

      return blocks;
    } catch (error) {
      console.error("AI Text Extraction Error:", error);
      setIsProcessing(false);
      setProgress(0);
      toast.error("Erreur lors de l'extraction du texte");
      return [];
    }
  }, []);

  const clearTextBlocks = useCallback(() => {
    setTextBlocks([]);
  }, []);

  return {
    isProcessing,
    progress,
    textBlocks,
    extractTextFromImage,
    clearTextBlocks,
  };
}
