import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGenerateImage, fail, notAuth } from "./_shared";

export default defineTool({
  name: "generate_poster",
  title: "Générer une affiche",
  description:
    "Lance la génération d'une affiche GraphisteGPT pour l'utilisateur connecté et renvoie immédiatement un job_id. Utiliser get_job_status ensuite pour récupérer l'image finale.",
  inputSchema: {
    prompt: z.string().describe("Contenu et brief complet de l'affiche (texte exact à reproduire, ambiance, style)."),
    domain: z.string().optional().describe("Domaine : restaurant, mode, immobilier, event, formation, eglise…"),
    aspectRatio: z.string().optional().describe("Format, ex : 9:16, 1:1, 16:9, 3:4. Défaut 9:16."),
    resolution: z.string().optional().describe("1K, 2K ou 4K. Défaut 2K."),
    quality: z.enum(["fast", "premium"]).optional().describe("fast (rapide) ou premium (qualité maximale)."),
    referenceImage: z.string().optional().describe("URL d'une affiche de référence à cloner ou dont s'inspirer."),
    templateId: z.string().optional().describe("Identifiant d'un modèle du catalogue (voir search_templates)."),
    locale: z.enum(["fr", "en"]).optional().describe("Langue des textes rédigés par l'IA. Défaut fr."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const { ok, status, body } = await callGenerateImage(ctx, {
      prompt: input.prompt,
      domain: input.domain,
      aspectRatio: input.aspectRatio ?? "9:16",
      resolution: input.resolution ?? "2K",
      quality: input.quality ?? "premium",
      referenceImage: input.referenceImage,
      templateId: input.templateId,
      locale: input.locale ?? "fr",
    });
    if (!ok || body?.success === false) {
      const msg = body?.message || body?.error || `Échec de la génération (HTTP ${status}).`;
      const upgrade = body?.upgrade_required === true ? " Crédits épuisés : un abonnement est nécessaire." : "";
      return fail(`${msg}${upgrade}`);
    }
    const jobId = body?.jobId ?? body?.job_id ?? null;
    return {
      content: [
        {
          type: "text",
          text: jobId
            ? `Génération lancée. job_id = ${jobId}. Interroger get_job_status pour suivre l'avancement.`
            : `Génération lancée : ${JSON.stringify(body).slice(0, 500)}`,
        },
      ],
      structuredContent: { job_id: jobId, status: body?.status ?? "processing" },
    };
  },
});
