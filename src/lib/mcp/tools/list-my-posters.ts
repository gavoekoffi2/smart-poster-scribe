import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_my_posters",
  title: "Lister mes affiches",
  description: "Liste les affiches générées par l'utilisateur GraphisteGPT connecté, les plus récentes d'abord.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Nombre max d'affiches à renvoyer (défaut 10)."),
    domain: z.string().optional().describe("Filtrer par domaine (ex : restaurant, mode, immobilier)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, domain }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase
      .from("generated_images")
      .select("id, prompt, domain, aspect_ratio, resolution, image_url, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (domain) q = q.eq("domain", domain);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const text = (data ?? []).length
      ? (data ?? []).map((p) => `• ${p.created_at} — ${p.domain ?? "n/a"} — ${p.aspect_ratio} — ${p.image_url}`).join("\n")
      : "Aucune affiche générée pour cet utilisateur.";
    return {
      content: [{ type: "text", text }],
      structuredContent: { posters: data ?? [] },
    };
  },
});
