import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash } from "crypto";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const setChannelPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ channelId: z.string().uuid(), password: z.string().min(1).max(200) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ch } = await supabase
      .from("channels")
      .select("id, space_id")
      .eq("id", data.channelId)
      .maybeSingle();
    if (!ch) throw new Error("Channel not found");
    const { data: ok } = await supabase.rpc("has_space_role", {
      _space: ch.space_id,
      _user: userId,
      _min: "manager",
    });
    if (!ok) throw new Error("Not allowed");
    await supabaseAdmin
      .from("channels")
      .update({ password_hash: sha(data.password) })
      .eq("id", data.channelId);
    return { ok: true };
  });

export const unlockChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ channelId: z.string().uuid(), password: z.string().min(1).max(200) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: ch } = await supabaseAdmin
      .from("channels")
      .select("id, password_hash, space_id, type")
      .eq("id", data.channelId)
      .maybeSingle();
    if (!ch || ch.type !== "locked") throw new Error("Not a locked channel");
    if (!ch.password_hash || ch.password_hash !== sha(data.password)) {
      throw new Error("Wrong password");
    }
    await supabaseAdmin
      .from("channel_access")
      .upsert({ channel_id: data.channelId, user_id: userId }, { onConflict: "channel_id,user_id" });
    return { ok: true };
  });

export const joinSpaceByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ code: z.string().min(1).max(64) }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = data.code.trim();
    let spaceId: string | null = null;
    const { data: byJoin } = await supabaseAdmin
      .from("spaces")
      .select("id")
      .eq("join_code", code)
      .maybeSingle();
    if (byJoin) spaceId = byJoin.id;
    if (!spaceId) {
      const { data: inv } = await supabaseAdmin
        .from("invites")
        .select("space_id, max_uses, uses, expires_at")
        .eq("code", code)
        .maybeSingle();
      if (inv) {
        if (inv.expires_at && new Date(inv.expires_at) < new Date())
          throw new Error("Invite expired");
        if (inv.max_uses && (inv.uses ?? 0) >= inv.max_uses) throw new Error("Invite exhausted");
        spaceId = inv.space_id;
        await supabaseAdmin
          .from("invites")
          .update({ uses: (inv.uses ?? 0) + 1 })
          .eq("code", code);
      }
    }
    if (!spaceId) throw new Error("Invalid code");
    await supabaseAdmin
      .from("space_members")
      .upsert({ space_id: spaceId, user_id: userId, role: "member" }, { onConflict: "space_id,user_id" });
    return { spaceId };
  });

export const startDm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ otherUserId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.otherUserId === userId) throw new Error("Cannot DM yourself");
    // Find existing thread with exactly these two participants
    const { data: mine } = await supabaseAdmin
      .from("dm_participants")
      .select("thread_id")
      .eq("user_id", userId);
    const myIds = (mine ?? []).map((r) => r.thread_id);
    if (myIds.length) {
      const { data: shared } = await supabaseAdmin
        .from("dm_participants")
        .select("thread_id")
        .eq("user_id", data.otherUserId)
        .in("thread_id", myIds);
      if (shared && shared.length) return { threadId: shared[0].thread_id };
    }
    const { data: t, error } = await supabaseAdmin
      .from("dm_threads")
      .insert({})
      .select("id")
      .single();
    if (error || !t) throw new Error(error?.message ?? "Failed");
    await supabaseAdmin.from("dm_participants").insert([
      { thread_id: t.id, user_id: userId },
      { thread_id: t.id, user_id: data.otherUserId },
    ]);
    return { threadId: t.id };
  });

export const checkUsernameAvailable = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ username: z.string().min(2).max(32) }).parse(i))
  .handler(async ({ data }) => {
    const u = data.username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (u.length < 2) return { available: false };
    const { data: exists } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", u)
      .maybeSingle();
    return { available: !exists };
  });