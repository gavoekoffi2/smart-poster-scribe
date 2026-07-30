import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, notAuth, requireAdmin } from "./_shared";

export default defineTool({
  name: "admin_list_generation_requests",
  title: "Journal des générations (admin)",
  description:
    "Réservé aux administrateurs. Liste les demandes de génération d'affiches, y compris celles des visiteurs non inscrits, avec leur statut et leurs erreurs.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Nombre max de lignes (défaut 50)."),
    status: z.string().optional().describe("Filtrer par statut : received, processing, completed, failed."),
    only_failed: z.boolean().optional().describe("Ne renvoyer que les demandes en échec."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status, only_failed }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const admin = await requireAdmin(ctx);
    if (!admin.ok) return fail(admin.error);
    const { data, error } = await admin.supabase.rpc("admin_list_generation_requests", {
      p_admin_id: ctx.getUserId(),
      p_limit: limit ?? 50,
    });
    if (error) return fail(error.message);
    let rows = (data ?? []) as any[];
    if (status) rows = rows.filter((r) => r.status === status || r.job_status === status);
    if (only_failed) rows = rows.filter((r) => r.status === "failed" || r.job_status === "failed" || !!r.error_message);
    const text = rows.length
      ? rows
          .map(
            (r) =>
              `• ${r.created_at} — ${r.is_anonymous ? "visiteur" : r.user_email ?? r.user_name ?? r.user_id} — ${r.domain ?? "n/a"} — ${r.job_status ?? r.status}${r.error_message ? ` — ERREUR: ${r.error_message}` : ""}\n  « ${(r.prompt ?? "").slice(0, 160)} »`,
          )
          .join("\n")
      : "Aucune demande trouvée.";
    return { content: [{ type: "text", text }], structuredContent: { requests: rows } };
  },
});
