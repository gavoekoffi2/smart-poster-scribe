import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, notAuth, requireAdmin } from "./_shared";

export default defineTool({
  name: "admin_list_users",
  title: "Utilisateurs (admin)",
  description:
    "Réservé aux administrateurs. Liste les utilisateurs GraphisteGPT avec leur plan, leurs crédits restants et leur statut d'abonnement.",
  inputSchema: {
    search: z.string().optional().describe("Filtre libre sur le nom, l'email ou l'entreprise."),
    limit: z.number().int().min(1).max(200).optional().describe("Nombre max de résultats (défaut 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const admin = await requireAdmin(ctx);
    if (!admin.ok) return fail(admin.error);
    const { data, error } = await admin.supabase.rpc("admin_get_users_with_subscriptions", {
      p_admin_id: ctx.getUserId(),
    });
    if (error) return fail(error.message);
    let rows = (data ?? []) as any[];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        [r.full_name, r.email, r.company_name].some((v) => typeof v === "string" && v.toLowerCase().includes(s)),
      );
    }
    rows = rows.slice(0, limit ?? 50);
    const text = rows.length
      ? rows
          .map(
            (r) =>
              `• ${r.full_name ?? "n/a"} <${r.email ?? "n/a"}> — ${r.plan_name ?? "gratuit"} (${r.sub_status ?? "n/a"}) — ${r.credits_remaining ?? 0} crédits — id=${r.user_id}`,
          )
          .join("\n")
      : "Aucun utilisateur trouvé.";
    return { content: [{ type: "text", text }], structuredContent: { users: rows } };
  },
});
