import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_my_credits",
  title: "Obtenir mes crédits",
  description: "Renvoie le solde de crédits et le plan d'abonnement de l'utilisateur GraphisteGPT connecté.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("plan_id, status, credits_remaining, free_generations_used, current_period_end")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const summary = data
      ? `Plan : ${data.plan_id} (${data.status}) — Crédits restants : ${data.credits_remaining}. Période jusqu'au ${data.current_period_end}.`
      : "Aucun abonnement actif — l'utilisateur est sur l'offre d'essai gratuite.";
    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { subscription: data },
    };
  },
});
