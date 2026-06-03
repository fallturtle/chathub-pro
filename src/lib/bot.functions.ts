import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function assertManager(spaceId: string, userId: string) {
  const { data: ok } = await supabaseAdmin.rpc("has_space_role", {
    _space: spaceId,
    _user: userId,
    _min: "manager",
  });
  if (!ok) throw new Error("Not allowed");
}

export const createBotWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        spaceId: z.string().uuid(),
        channelId: z.string().uuid(),
        name: z.string().trim().min(1).max(64),
        avatarUrl: z.string().url().max(500).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await assertManager(data.spaceId, userId);
    const { data: ch } = await supabaseAdmin
      .from("channels").select("id, space_id, type").eq("id", data.channelId).maybeSingle();
    if (!ch || ch.space_id !== data.spaceId) throw new Error("Channel not in space");
    if ((ch as any).type === "locked") throw new Error("Cannot create webhook for locked channels");
    const { data: hook, error } = await supabaseAdmin
      .from("bot_webhooks")
      .insert({
        space_id: data.spaceId, channel_id: data.channelId,
        name: data.name, avatar_url: data.avatarUrl ?? null,
        created_by: userId, enabled: true,
      })
      .select("id").single();
    if (error || !hook) throw new Error(error?.message ?? "Failed to create");
    const token = randomToken();
    await supabaseAdmin.from("bot_webhook_tokens").insert({
      webhook_id: hook.id, token_hash: await sha256Hex(token),
    });
    return { id: hook.id, token };
  });

export const rotateBotWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ webhookId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: hook } = await supabaseAdmin
      .from("bot_webhooks").select("id, space_id").eq("id", data.webhookId).maybeSingle();
    if (!hook) throw new Error("Not found");
    await assertManager(hook.space_id, userId);
    await supabaseAdmin.from("bot_webhook_tokens").delete().eq("webhook_id", hook.id);
    const token = randomToken();
    await supabaseAdmin.from("bot_webhook_tokens").insert({
      webhook_id: hook.id, token_hash: await sha256Hex(token),
    });
    return { token };
  });