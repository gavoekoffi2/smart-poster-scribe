import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, notAuth, requireAdmin } from "./_shared";

export default defineTool({
  name: "admin_generation_stats",
  title: "Statistiques de génération (admin)",
  description:
    "Réservé aux administrateurs. Calcule le volume, le taux d'échec et la répartition par domaine des générations récentes.",
  inputSchema: {
    hours: z.number().int().min(1).max(720).optional().describe("Fenêtre d'analyse en heures (défaut 24)."),
    sample: z.number().int().min(50).max(1000).optional().describe("Nombre max de demandes analysées (défaut 500)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ hours, sample }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const admin = await requireAdmin(ctx);
    if (!admin.ok) return fail(admin.error);
    const { data, error } = await admin.supabase.rpc("admin_list_generation_requests", {
      p_admin_id: ctx.getUserId(),
      p_limit: sample ?? 500,
    });
    if (error) return fail(error.message);
    const since = Date.now() - (hours ?? 24) * 3600 * 1000;
    const rows = ((data ?? []) as any[]).filter((r) => new Date(r.created_at).getTime() >= since);
    const failed = rows.filter((r) => r.status === "failed" || r.job_status === "failed").length;
    const completed = rows.filter((r) => r.job_status === "completed").length;
    const anonymous = rows.filter((r) => r.is_anonymous).length;
    const byDomain: Record<string, number> = {};
    for (const r of rows) byDomain[r.domain ?? "n/a"] = (byDomain[r.domain ?? "n/a"] ?? 0) + 1;
    const stats = {
      window_hours: hours ?? 24,
      total: rows.length,
      completed,
      failed,
      failure_rate: rows.length ? Math.round((failed / rows.length) * 1000) / 10 : 0,
      anonymous,
      by_domain: byDomain,
    };
    const text = [
      `Fenêtre : ${stats.window_hours}h`,
      `Total : ${stats.total} — Terminées : ${completed} — Échecs : ${failed} (${stats.failure_rate}%)`,
      `Visiteurs non inscrits : ${anonymous}`,
      `Par domaine : ${Object.entries(byDomain).map(([d, n]) => `${d}=${n}`).join(", ") || "n/a"}`,
    ].join("\n");
    return { content: [{ type: "text", text }], structuredContent: { stats } };
  },
});
