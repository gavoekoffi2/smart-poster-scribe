import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplateInput {
  domain: string;
  design_category: string;
  image_url: string;
  description?: string;
  tags?: string[];
}

interface TemplateQuery {
  domain?: string;
  design_category?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    // LIST templates
    if (req.method === "GET" || action === "list") {
      const domain = url.searchParams.get("domain");
      const category = url.searchParams.get("category");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabase
        .from("reference_templates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (domain) {
        query = query.eq("domain", domain);
      }
      if (category) {
        query = query.eq("design_category", category);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      return new Response(JSON.stringify({ success: true, templates: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ADD template(s)
    if (req.method === "POST" && action === "add") {
      const body = await req.json();
      const templates: TemplateInput[] = Array.isArray(body.templates) 
        ? body.templates 
        : [body];

      // Validate templates
      for (const template of templates) {
        if (!template.domain || !template.design_category || !template.image_url) {
          throw new Error("Each template must have domain, design_category, and image_url");
        }
      }

      const { data, error } = await supabase
        .from("reference_templates")
        .insert(templates)
        .select();

      if (error) {
        throw new Error(`Failed to insert templates: ${error.message}`);
      }

      return new Response(JSON.stringify({ success: true, inserted: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE template
    if (req.method === "DELETE" || action === "delete") {
      const id = url.searchParams.get("id");
      
      if (!id) {
        throw new Error("Template ID is required for deletion");
      }

      const { error } = await supabase
        .from("reference_templates")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(`Failed to delete template: ${error.message}`);
      }

      return new Response(JSON.stringify({ success: true, deleted: id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET random template for domain
    if (action === "random") {
      const domain = url.searchParams.get("domain");
      
      if (!domain) {
        throw new Error("Domain is required for random selection");
      }

      // Fetch all templates for domain and select random
      const { data, error } = await supabase
        .from("reference_templates")
        .select("*")
        .eq("domain", domain);

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          template: null,
          message: `No templates found for domain: ${domain}` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const randomIndex = Math.floor(Math.random() * data.length);
      const randomTemplate = data[randomIndex];

      return new Response(JSON.stringify({ success: true, template: randomTemplate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET stats
    if (action === "stats") {
      const { data, error } = await supabase
        .from("reference_templates")
        .select("domain");

      if (error) {
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      // Count by domain
      const stats: Record<string, number> = {};
      for (const template of data || []) {
        stats[template.domain] = (stats[template.domain] || 0) + 1;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        stats,
        total: data?.length || 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
