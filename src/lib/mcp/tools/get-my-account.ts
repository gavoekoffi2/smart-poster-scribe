import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { fail, notAuth, userClient } from "./_shared";

export default defineTool({
  name: "get_my_account",
  title: "Mon compte",
  description:
    "Renvoie le profil GraphisteGPT de l'utilisateur connecté : nom, entreprise, secteur, logo et couleurs par défaut, ainsi que son abonnement.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return notAuth();
    const supabase = userClient(ctx);
    const [{ data: profile, error: pErr }, { data: sub }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, company_name, industry, phone, website, country, default_logo_url, default_color_palette, onboarding_completed")
        .eq("user_id", ctx.getUserId())
        .maybeSingle(),
      supabase
        .from("user_subscriptions")
        .select("plan_id, status, credits_remaining, free_generations_used, current_period_end")
        .eq("user_id", ctx.getUserId())
        .maybeSingle(),
    ]);
    if (pErr) return fail(pErr.message);
    const text = [
      `Utilisateur : ${profile?.full_name ?? "n/a"} (${ctx.getUserEmail() ?? "email inconnu"})`,
      `Entreprise : ${profile?.company_name ?? "n/a"} — Secteur : ${profile?.industry ?? "n/a"}`,
      `Logo par défaut : ${profile?.default_logo_url ?? "aucun"}`,
      sub
        ? `Abonnement : ${sub.status} — ${sub.credits_remaining} crédits, jusqu'au ${sub.current_period_end}`
        : "Abonnement : aucun (offre gratuite)",
    ].join("\n");
    return { content: [{ type: "text", text }], structuredContent: { profile, subscription: sub ?? null } };
  },
});
