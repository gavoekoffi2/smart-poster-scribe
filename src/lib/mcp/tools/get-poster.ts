import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_poster",
  title: "Détails d'une affiche",
  description: "Renvoie les détails complets d'une affiche générée appartenant à l'utilisateur connecté.",
  inputSchema: {
    id: z.string().uuid().describe("Identifiant de l'affiche."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("generated_images")
      .select("*")
      .eq("id", id)
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Affiche introuvable." }], isError: true };
    return {
      content: [{ type: "text", text: `Affiche ${data.id} — ${data.image_url}\nPrompt : ${data.prompt}` }],
      structuredContent: { poster: data },
    };
  },
});
