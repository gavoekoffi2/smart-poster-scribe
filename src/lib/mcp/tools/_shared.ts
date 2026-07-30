import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/** Client Supabase agissant EXACTEMENT au nom de l'utilisateur OAuth (RLS appliquée). */
export function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function notAuth() {
  return { content: [{ type: "text" as const, text: "Non authentifié." }], isError: true };
}

export function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/** Vérifie que l'utilisateur connecté possède un rôle d'administration. */
export async function requireAdmin(ctx: ToolContext) {
  const supabase = userClient(ctx);
  const { data, error } = await supabase.rpc("has_any_role", {
    _user_id: ctx.getUserId(),
    _roles: ["super_admin", "admin"],
  });
  if (error) return { ok: false as const, error: error.message };
  if (data !== true) return { ok: false as const, error: "Accès refusé : compte non administrateur." };
  return { ok: true as const, supabase };
}

/** Appelle l'edge function generate-image avec le jeton de l'utilisateur. */
export async function callGenerateImage(ctx: ToolContext, payload: Record<string, unknown>) {
  const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/generate-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
      Authorization: `Bearer ${ctx.getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}
