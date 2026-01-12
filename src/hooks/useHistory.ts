import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedImage, LogoPosition, AspectRatio, Resolution, Domain } from "@/types/generation";
import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";

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

interface UpdateImageParams {
  id: string;
  imageUrl: string;
}

export function useHistory() {
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch history on mount and when user changes
  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false });

      // If user is logged in, only fetch their images
      if (user) {
        query = query.eq("user_id", user.id);
      } else {
        // For non-logged users, fetch images with null user_id
        query = query.is("user_id", null);
      }

      const { data, error } = await query;

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
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Save a new image to history
  const saveToHistory = useCallback(async (params: SaveImageParams): Promise<GeneratedImage | null> => {
    try {
      const insertData: any = {
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
      };

      // Add user_id if user is logged in
      if (user) {
        insertData.user_id = user.id;
      }

      const { data, error } = await supabase
        .from("generated_images")
        .insert(insertData)
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
      
      if (user) {
        toast.success("Image sauvegardée dans votre historique");
      }
      
      return newImage;
    } catch (err) {
      console.error("Error saving to history:", err);
      return null;
    }
  }, [user]);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      let query = supabase.from("generated_images").delete();
      
      if (user) {
        query = query.eq("user_id", user.id);
      } else {
        query = query.is("user_id", null);
      }

      const { error } = await query;

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
  }, [user]);

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

  // Upload edited image to Supabase Storage and update the record
  const updateEditedImage = useCallback(async (params: UpdateImageParams): Promise<GeneratedImage | null> => {
    try {
      // Convert base64 to blob if it's a data URL
      let imageBlob: Blob;
      if (params.imageUrl.startsWith('data:')) {
        const response = await fetch(params.imageUrl);
        imageBlob = await response.blob();
      } else {
        return null;
      }

      // Generate unique filename
      const fileName = `edited-${params.id}-${Date.now()}.png`;
      const filePath = user ? `${user.id}/${fileName}` : `anonymous/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-images')
        .upload(filePath, imageBlob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error("Error uploading edited image:", uploadError);
        toast.error("Erreur lors de l'upload de l'image éditée");
        return null;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('temp-images')
        .getPublicUrl(filePath);

      const newImageUrl = publicUrlData.publicUrl;

      // Update the record in the database
      const { data, error } = await supabase
        .from("generated_images")
        .update({ image_url: newImageUrl })
        .eq("id", params.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating image record:", error);
        toast.error("Erreur lors de la mise à jour de l'historique");
        return null;
      }

      const updatedImage: GeneratedImage = {
        id: data.id,
        imageUrl: data.image_url,
        prompt: data.prompt,
        aspectRatio: data.aspect_ratio as AspectRatio,
        resolution: data.resolution as Resolution,
        domain: data.domain as Domain | undefined,
        createdAt: new Date(data.created_at),
      };

      // Update local history state
      setHistory((prev) => 
        prev.map((img) => img.id === params.id ? updatedImage : img)
      );

      toast.success("Image éditée sauvegardée dans l'historique");
      return updatedImage;
    } catch (err) {
      console.error("Error updating edited image:", err);
      toast.error("Erreur lors de la sauvegarde de l'image éditée");
      return null;
    }
  }, [user]);

  return {
    history,
    isLoading,
    isAuthenticated: !!user,
    user,
    saveToHistory,
    clearHistory,
    deleteFromHistory,
    updateEditedImage,
    refreshHistory: fetchHistory,
  };
}
