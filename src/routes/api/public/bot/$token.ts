import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const Body = z.object({
  text: z.string().trim().min(1).max(4000),
  username: z.string().trim().min(1).max(64).optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/bot/$token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ params, request }) => {
        const token = params.token;
        if (!token || token.length < 16) return new Response("Invalid token", { status: 401, headers: CORS });
        let raw: unknown;
        try { raw = await request.json(); } catch { return new Response("Invalid JSON", { status: 400, headers: CORS }); }
        const parsed = Body.safeParse(raw);
        if (!parsed.success) return new Response("Invalid body", { status: 400, headers: CORS });

        const hash = await sha256Hex(token);
        const { data: tok } = await supabaseAdmin
          .from("bot_webhook_tokens").select("webhook_id").eq("token_hash", hash).maybeSingle();
        if (!tok) return new Response("Unauthorized", { status: 401, headers: CORS });
        const { data: hook } = await supabaseAdmin
          .from("bot_webhooks")
          .select("id, enabled, channel_id, created_by, name")
          .eq("id", tok.webhook_id).maybeSingle();
        if (!hook || !hook.enabled || !hook.channel_id) return new Response("Disabled", { status: 403, headers: CORS });

        const prefix = `🤖 **${parsed.data.username ?? hook.name}**: `;
        const { error } = await supabaseAdmin.from("messages").insert({
          channel_id: hook.channel_id,
          author_id: hook.created_by,
          body: parsed.data.text,
          bot_name: parsed.data.username ?? hook.name,
        });
        if (error) return new Response(error.message, { status: 500, headers: CORS });
        await supabaseAdmin.from("bot_webhooks").update({ last_used_at: new Date().toISOString() }).eq("id", hook.id);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...CORS, "Content-Type": "application/json" },
        });
      },
    },
  },
});