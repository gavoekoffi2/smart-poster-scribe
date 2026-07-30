import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, notAuth, requireAdmin } from "./_shared";

export default defineTool({
  name: "admin_set_subscription",
  title: "Attribuer un abonnement (admin)",
  description:
    "Réservé aux administrateurs. Active ou prolonge un abonnement pour un utilisateur (offert ou manuel), avec un plan, des crédits et une durée en mois.",
  inputSchema: {
    user_id: z.string().uuid().describe("Identifiant de l'utilisateur bénéficiaire (voir admin_list_users)."),
    plan_slug: z.string().describe("Slug du plan : free, essentiel, illimite…"),
    credits: z.number().int().min(0).max(100000).describe("Crédits à créditer sur la période."),
    duration_months: z.number().int().min(1).max(36).describe("Durée de l'abonnement en mois."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ user_id, plan_slug, credits, duration_months }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const admin = await requireAdmin(ctx);
    if (!admin.ok) return fail(admin.error);
    const { data, error } = await admin.supabase.rpc("admin_grant_subscription", {
      p_admin_id: ctx.getUserId(),
      p_target_user_id: user_id,
      p_plan_slug: plan_slug,
      p_credits: credits,
      p_duration_months: duration_months,
    });
    if (error) return fail(error.message);
    return {
      content: [
        {
          type: "text",
          text: `Abonnement « ${plan_slug} » accordé à ${user_id} : ${credits} crédits pour ${duration_months} mois.`,
        },
      ],
      structuredContent: { result: data },
    };
  },
});
