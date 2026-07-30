import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, notAuth, requireAdmin } from "./_shared";

export default defineTool({
  name: "admin_moderate_showcase",
  title: "Modérer la vitrine (admin)",
  description:
    "Réservé aux administrateurs. Ajoute ou retire une affiche générée de la vitrine publique de GraphisteGPT.",
  inputSchema: {
    poster_id: z.string().uuid().describe("Identifiant de l'affiche générée."),
    publish: z.boolean().describe("true pour publier dans la vitrine, false pour la retirer."),
    order: z.number().int().min(0).max(999).optional().describe("Position d'affichage dans la vitrine."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ poster_id, publish, order }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const admin = await requireAdmin(ctx);
    if (!admin.ok) return fail(admin.error);
    const patch: Record<string, unknown> = { is_showcase: publish };
    if (typeof order === "number") patch.showcase_order = order;
    const { data, error } = await admin.supabase
      .from("generated_images")
      .update(patch)
      .eq("id", poster_id)
      .select("id, is_showcase, showcase_order")
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Affiche introuvable.");
    return {
      content: [{ type: "text", text: `Affiche ${poster_id} ${publish ? "publiée dans" : "retirée de"} la vitrine.` }],
      structuredContent: { poster: data },
    };
  },
});
