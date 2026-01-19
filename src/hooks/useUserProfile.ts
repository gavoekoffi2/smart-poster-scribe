import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  default_logo_url: string | null;
  default_color_palette: string[];
  cover_image_url: string | null;
  company_name: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  how_heard_about_us: string | null;
  expectations: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return false;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Erreur lors de la mise à jour du profil");
        return false;
      }

      await fetchProfile();
      toast.success("Profil mis à jour avec succès");
      return true;
    } catch (err) {
      console.error("Unexpected error updating profile:", err);
      toast.error("Erreur inattendue");
      return false;
    }
  };

  const uploadImage = async (file: File, type: "avatar" | "cover" | "logo"): Promise<string | null> => {
    if (!user) {
      toast.error("Vous devez être connecté pour télécharger une image");
      return null;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    // Use flat structure for better compatibility with storage policies
    const fileName = `${type}_${user.id}_${uniqueId}.${fileExt}`;
    const bucket = "temp-images";

    try {
      console.log(`Uploading ${type} image:`, fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { 
          cacheControl: "3600",
          upsert: false // Don't overwrite, use unique names
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error(`Erreur lors du téléchargement: ${uploadError.message}`);
        return null;
      }

      console.log("Upload success:", uploadData);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log("Public URL:", urlData.publicUrl);
      toast.success("Image téléchargée avec succès");
      return urlData.publicUrl;
    } catch (err) {
      console.error("Unexpected upload error:", err);
      toast.error("Erreur inattendue lors du téléchargement");
      return null;
    }
  };

  const updateAvatar = async (file: File) => {
    const url = await uploadImage(file, "avatar");
    if (url) {
      return updateProfile({ avatar_url: url });
    }
    return false;
  };

  const updateCover = async (file: File) => {
    const url = await uploadImage(file, "cover");
    if (url) {
      return updateProfile({ cover_image_url: url });
    }
    return false;
  };

  const updateDefaultLogo = async (file: File) => {
    const url = await uploadImage(file, "logo");
    if (url) {
      return updateProfile({ default_logo_url: url });
    }
    return false;
  };

  const updateDefaultColors = async (colors: string[]) => {
    return updateProfile({ default_color_palette: colors });
  };

  const removeDefaultLogo = async () => {
    return updateProfile({ default_logo_url: null });
  };

  return {
    profile,
    isLoading,
    fetchProfile,
    updateProfile,
    updateAvatar,
    updateCover,
    updateDefaultLogo,
    updateDefaultColors,
    removeDefaultLogo,
  };
}
