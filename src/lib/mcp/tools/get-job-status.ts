import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, notAuth, userClient } from "./_shared";

export default defineTool({
  name: "get_job_status",
  title: "Statut d'une génération",
  description:
    "Renvoie l'état d'un job de génération d'affiche (pending, processing, completed avec l'URL de l'image, ou failed avec le message d'erreur).",
  inputSchema: {
    job_id: z.string().uuid().describe("Identifiant du job renvoyé par generate_poster ou modify_poster."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ job_id }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const { data, error } = await userClient(ctx)
      .from("image_jobs")
      .select("id, status, result_url, error_message, error_code, model_used, provider_used, fallback_used, created_at, updated_at")
      .eq("id", job_id)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Job introuvable.");
    const text =
      data.status === "completed"
        ? `Terminé — ${data.result_url}`
        : data.status === "failed"
          ? `Échec — ${data.error_code ?? ""} ${data.error_message ?? ""}`.trim()
          : `En cours (${data.status}).`;
    return { content: [{ type: "text", text }], structuredContent: { job: data } };
  },
});
