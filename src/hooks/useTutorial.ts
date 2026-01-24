import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTutorial(userId: string | undefined) {
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    checkTutorialStatus();
  }, [userId]);

  const checkTutorialStatus = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("tutorial_completed")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If no profile exists yet, we should show the tutorial
        if (error.code === "PGRST116") {
          setShouldShowTutorial(true);
        } else {
          console.error("Error checking tutorial status:", error);
        }
      } else {
        // Show tutorial if not completed
        setShouldShowTutorial(data?.tutorial_completed !== true);
      }
    } catch (err) {
      console.error("Error fetching tutorial status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const completeTutorial = () => {
    setShouldShowTutorial(false);
  };

  return {
    shouldShowTutorial,
    isLoading,
    completeTutorial
  };
}
