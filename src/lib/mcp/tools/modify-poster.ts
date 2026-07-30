import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGenerateImage, fail, notAuth, userClient } from "./_shared";

export default defineTool({
  name: "modify_poster",
  title: "Modifier une affiche",
  description:
    "Relance une affiche déjà générée en appliquant une modification précise (couleur, texte, mise en page). Gratuit, sans débit de crédits. Renvoie un job_id à suivre avec get_job_status.",
  inputSchema: {
    poster_id: z.string().uuid().describe("Identifiant de l'affiche existante à modifier (voir list_my_posters)."),
    modification: z.string().describe("Modification demandée, en une ou deux phrases précises."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ poster_id, modification }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const supabase = userClient(ctx);
    const { data: poster, error } = await supabase
      .from("generated_images")
      .select("id, prompt, image_url, domain, aspect_ratio, resolution")
      .eq("id", poster_id)
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return fail(error.message);
    if (!poster) return fail("Affiche introuvable.");

    const { ok, status, body } = await callGenerateImage(ctx, {
      prompt: poster.prompt,
      domain: poster.domain,
      aspectRatio: poster.aspect_ratio,
      resolution: poster.resolution,
      quality: "premium",
      referenceImage: poster.image_url,
      isModification: true,
      modificationRequest: modification,
      locale: "fr",
    });
    if (!ok || body?.success === false) {
      return fail(body?.message || body?.error || `Échec de la modification (HTTP ${status}).`);
    }
    const jobId = body?.jobId ?? body?.job_id ?? null;
    return {
      content: [{ type: "text", text: `Modification lancée. job_id = ${jobId}.` }],
      structuredContent: { job_id: jobId, status: body?.status ?? "processing" },
    };
  },
});
