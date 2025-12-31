import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Domain } from "@/types/generation";

export interface ReferenceTemplate {
  id: string;
  domain: string;
  design_category: string;
  image_url: string;
  description: string | null;
  tags: string[] | null;
  created_at: string;
}

interface TemplateStats {
  [domain: string]: number;
}

export function useReferenceTemplates() {
  const [templates, setTemplates] = useState<ReferenceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates by domain
  const fetchTemplates = useCallback(async (domain?: Domain, limit = 50) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("reference_templates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (domain) {
        query = query.eq("domain", domain);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setTemplates(data as ReferenceTemplate[]);
      return data as ReferenceTemplate[];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch templates";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get random template for a domain
  const getRandomTemplate = useCallback(async (domain: Domain): Promise<ReferenceTemplate | null> => {
    try {
      const { data, error: queryError } = await supabase
        .from("reference_templates")
        .select("*")
        .eq("domain", domain);

      if (queryError) {
        throw new Error(queryError.message);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const randomIndex = Math.floor(Math.random() * data.length);
      return data[randomIndex] as ReferenceTemplate;
    } catch (err) {
      console.error("Error fetching random template:", err);
      return null;
    }
  }, []);

  // Get stats (count by domain)
  const getStats = useCallback(async (): Promise<TemplateStats> => {
    try {
      const { data, error: queryError } = await supabase
        .from("reference_templates")
        .select("domain");

      if (queryError) {
        throw new Error(queryError.message);
      }

      const stats: TemplateStats = {};
      for (const template of data || []) {
        stats[template.domain] = (stats[template.domain] || 0) + 1;
      }

      return stats;
    } catch (err) {
      console.error("Error fetching stats:", err);
      return {};
    }
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    getRandomTemplate,
    getStats,
  };
}
