import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedImage, LogoPosition, AspectRatio, Resolution, Domain } from "@/types/generation";
import { toast } from "sonner";

interface SaveImageParams {
  imageUrl: string;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  domain?: string;
  referenceImageUrl?: string;
  contentImageUrl?: string;
  logoUrls?: string[];
  logoPositions?: LogoPosition[];
  colorPalette?: string[];
}

export function useHistory() {
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch history on mount
  const fetchHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error);
        return;
      }

      const images: GeneratedImage[] = (data || []).map((row: any) => ({
        id: row.id,
        imageUrl: row.image_url,
        prompt: row.prompt,
        aspectRatio: row.aspect_ratio as AspectRatio,
        resolution: row.resolution as Resolution,
        domain: row.domain as Domain | undefined,
        createdAt: new Date(row.created_at),
      }));

      setHistory(images);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Save a new image to history
  const saveToHistory = useCallback(async (params: SaveImageParams): Promise<GeneratedImage | null> => {
    try {
      const { data, error } = await supabase
        .from("generated_images")
        .insert({
          image_url: params.imageUrl,
          prompt: params.prompt,
          aspect_ratio: params.aspectRatio,
          resolution: params.resolution,
          domain: params.domain || null,
          reference_image_url: params.referenceImageUrl || null,
          content_image_url: params.contentImageUrl || null,
          logo_urls: params.logoUrls || null,
          logo_positions: params.logoPositions || null,
          color_palette: params.colorPalette || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving to history:", error);
        toast.error("Erreur lors de la sauvegarde dans l'historique");
        return null;
      }

      const newImage: GeneratedImage = {
        id: data.id,
        imageUrl: data.image_url,
        prompt: data.prompt,
        aspectRatio: data.aspect_ratio as AspectRatio,
        resolution: data.resolution as Resolution,
        domain: data.domain as Domain | undefined,
        createdAt: new Date(data.created_at),
      };

      setHistory((prev) => [newImage, ...prev]);
      return newImage;
    } catch (err) {
      console.error("Error saving to history:", err);
      return null;
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("generated_images")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) {
        console.error("Error clearing history:", error);
        toast.error("Erreur lors de la suppression de l'historique");
        return;
      }

      setHistory([]);
      toast.success("Historique effacé");
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  }, []);

  // Delete a single image
  const deleteFromHistory = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("generated_images")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting image:", error);
        toast.error("Erreur lors de la suppression");
        return;
      }

      setHistory((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      console.error("Error deleting image:", err);
    }
  }, []);

  return {
    history,
    isLoading,
    saveToHistory,
    clearHistory,
    deleteFromHistory,
    refreshHistory: fetchHistory,
  };
}
