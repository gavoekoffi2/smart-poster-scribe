import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_templates",
  title: "Rechercher des modèles",
  description: "Recherche dans le catalogue public de modèles d'affiches GraphisteGPT par domaine ou mot-clé.",
  inputSchema: {
    domain: z.string().optional().describe("Domaine (restaurant, mode, immobilier, événement…)."),
    query: z.string().optional().describe("Mot-clé libre à rechercher dans les tags ou la description."),
    limit: z.number().int().min(1).max(50).optional().describe("Nombre max de résultats (défaut 12)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ domain, query, limit }, ctx: ToolContext) => {
    const supabase = ctx.isAuthenticated()
      ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    let q = supabase
      .from("reference_templates")
      .select("id, domain, design_category, description, image_url, tags")
      .eq("is_active", true)
      .limit(limit ?? 12);
    if (domain) q = q.eq("domain", domain);
    if (query) q = q.or(`description.ilike.%${query}%,tags.cs.{${query}}`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const text = (data ?? []).length
      ? (data ?? []).map((t) => `• [${t.domain}/${t.design_category}] ${t.description ?? ""} — ${t.image_url}`).join("\n")
      : "Aucun modèle trouvé.";
    return {
      content: [{ type: "text", text }],
      structuredContent: { templates: data ?? [] },
    };
  },
});
