import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, notAuth, userClient } from "./_shared";

export default defineTool({
  name: "rate_poster",
  title: "Noter une affiche",
  description: "Enregistre une note (1 à 5) et un commentaire sur une affiche générée par l'utilisateur connecté.",
  inputSchema: {
    poster_id: z.string().uuid().describe("Identifiant de l'affiche."),
    rating: z.number().int().min(1).max(5).describe("Note de 1 à 5."),
    comment: z.string().optional().describe("Commentaire libre sur le résultat."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ poster_id, rating, comment }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const { error } = await userClient(ctx).rpc("submit_generation_feedback", {
      p_user_id: ctx.getUserId(),
      p_image_id: poster_id,
      p_rating: rating,
      p_comment: comment ?? null,
    });
    if (error) return fail(error.message);
    return { content: [{ type: "text", text: `Note ${rating}/5 enregistrée pour l'affiche ${poster_id}.` }] };
  },
});
