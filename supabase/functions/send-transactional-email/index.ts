// Transactional email sender (Resend). Used by triggers via pg_net or by edge functions directly.
// Templates: welcome, payment_succeeded, payment_failed, low_credits, generation_completed, payout_processed.
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("EMAIL_FROM") || "Graphiste GPT <no-reply@graphistegpt.pro>";
const APP_URL = Deno.env.get("APP_URL") || "https://graphistegpt.pro";

type Template =
  | "welcome"
  | "payment_succeeded"
  | "payment_failed"
  | "low_credits"
  | "generation_completed"
  | "payout_processed"
  | "abandoned_cart";

function shell(title: string, inner: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0b0b12;color:#e7e7f0">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:linear-gradient(135deg,#6d28d9,#db2777);padding:1px;border-radius:16px">
      <div style="background:#13131c;border-radius:15px;padding:32px">
        <h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
        <div style="line-height:1.6;color:#c9c9d6;font-size:15px">${inner}</div>
        ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;padding:12px 22px;border-radius:10px;background:linear-gradient(135deg,#6d28d9,#db2777);color:#fff;text-decoration:none;font-weight:600">${cta.label}</a>` : ""}
        <p style="margin-top:32px;font-size:12px;color:#6b6b80">Graphiste GPT — Visuels pro générés par IA<br/>contact@graphistegpt.pro</p>
      </div>
    </div>
  </div></body></html>`;
}

function render(template: Template, data: Record<string, any>) {
  switch (template) {
    case "welcome":
      return {
        subject: "Bienvenue sur Graphiste GPT 🎨",
        html: shell(
          `Bienvenue ${data.name || ""} !`,
          `Votre compte est prêt. Vous disposez de <b>${data.credits ?? 3} crédits offerts</b> pour générer vos premières affiches. Commencez en un clic.`,
          { label: "Créer ma première affiche", href: `${APP_URL}/app` },
        ),
      };
    case "payment_succeeded":
      return {
        subject: `Paiement confirmé — Plan ${data.plan}`,
        html: shell(
          "Paiement reçu ✅",
          `Merci ! Votre abonnement <b>${data.plan}</b> est actif. ${data.credits ? `<b>${data.credits} crédits</b> ont été ajoutés à votre compte.` : ""}`,
          { label: "Accéder à mon compte", href: `${APP_URL}/account` },
        ),
      };
    case "payment_failed":
      return {
        subject: "Paiement échoué — Réessayez en 1 clic",
        html: shell(
          "Le paiement n'a pas pu être traité",
          `Aucun montant n'a été débité. Vous pouvez relancer la transaction depuis votre compte.`,
          { label: "Réessayer le paiement", href: `${APP_URL}/pricing` },
        ),
      };
    case "low_credits":
      return {
        subject: "Plus que quelques crédits — Offre flash -20%",
        html: shell(
          "Vos crédits diminuent",
          `Il vous reste <b>${data.credits ?? 0} crédits</b>. Profitez du code <b>BOOST20</b> (24h) pour <b>-20%</b> sur tout abonnement.`,
          { label: "Recharger maintenant", href: `${APP_URL}/pricing` },
        ),
      };
    case "abandoned_cart":
      return {
        subject: `Vous avez oublié votre abonnement ${data.plan} ? Voici -10%`,
        html: shell(
          "Finalisez votre abonnement",
          `Votre commande pour le plan <b>${data.plan}</b> n'a pas été finalisée. Utilisez le code <b>${data.code || "REVIENS10"}</b> pour <b>-10%</b> (valable 48h).`,
          { label: "Reprendre la commande", href: `${APP_URL}/pricing` },
        ),
      };
    case "generation_completed":
      return {
        subject: "Votre affiche est prête ✨",
        html: shell(
          "Génération terminée",
          `Votre nouvelle affiche est disponible. Téléchargez-la ou faites une nouvelle variation.`,
          { label: "Voir l'affiche", href: `${APP_URL}/app` },
        ),
      };
    case "payout_processed":
      return {
        subject: `Paiement envoyé — ${data.amount} $`,
        html: shell(
          "Votre retrait a été traité 💸",
          `Nous avons envoyé <b>${data.amount} $</b> via <b>${data.method}</b>. Référence : <code>${data.reference || "-"}</code>.`,
          { label: "Voir l'historique", href: `${APP_URL}/account` },
        ),
      };
    default:
      return { subject: "Notification", html: shell("Notification", JSON.stringify(data)) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const { to, template, data } = await req.json();
    if (!to || !template) {
      return new Response(JSON.stringify({ error: "to and template required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { subject, html } = render(template as Template, data || {});
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    const body = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, body }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
