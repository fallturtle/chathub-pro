Big update — I'll group the work so you can see what's in scope, what's a "lite" version, and what I'd push to a follow-up. At the end I'll answer your districts/orgs question.

## Group A — Ship in this update (full)

1. **Per-user themes** — extend Settings with accent color, font, density (compact/cozy/roomy). Stored in `profiles` + applied via CSS vars.
2. **Drafts persist per channel/DM** — `localStorage` keyed by `channel:<id>` / `dm:<id>`, restored on mount.
3. **Saved messages / bookmarks** — new `bookmarks` table, "Saved" entry in sidebar, bookmark icon on message hover.
4. **Read receipts + unread badges in DMs only** — `dm_participants.last_read_at` already exists conceptually; add column + update on view, badge in sidebar.
5. **Channel categories / collapsible groups** — add `channels.category` text column; group + collapse in sidebar (state in localStorage).
6. **Slowmode per channel** — `channels.slowmode_seconds`, enforced by trigger (per author, per channel). Owners/managers edit in channel settings.
7. **Auto-mod presets** (Strict/Balanced/Chill/Off) — single setting on space; maps to existing rate-limit + blocked-word seeding.
8. **Profanity list strictness picker** — clicking "Insert suggested list" opens a dialog with Strict / Balanced / Chill options and inserts a different word set per level.
9. **Polls v2** — multi-question, anonymous toggle, scheduled close (`polls.closes_at`).
10. **Profile cards on hover** — HoverCard with avatar, status, tags, "Send DM" button.
11. **Server-wide (global) search** — new `/app/search` route, queries messages across joined spaces + DMs you're in.
12. **Export channel history** — server fn returns JSON / Markdown / TXT for a channel. Manager and owner only.
13. **/report command** — `/report @user reason…` creates a row in `reports` table visible to space owners/managers in a new "Reports" page.
14. **Site-admin escalation + dashboard** — owners/managers click "Escalate to site admins" → `site_reports`. New `/app/admin` route gated by `has_role('admin')`, lists reports + spaces + users. When they click to escalate it they have to write a like mini report type of thing.
15. **Scrollable sidebar** — wrap the spaces list in scroll area so it doesn't push off-screen.
16. **Invite by username** — Members page: "Add by @username" input → inserts into `space_members`. Sends a join request to that user.
17. **DM-style status banner** — show recipient's `status_text` at top of DM until dismissed (×). Dismissal stored in localStorage per thread.
18. **Multi-channel bots** — new `bot_channels` table (webhook_id, channel_id). UI lets managers pick multiple channels. Trigger updated.
19. **Custom /commands per space** — `space_commands` table (name, response template). Composer recognizes and posts via bot identity.
20. **Tag badges on messages** — fetch `member_tags` with messages and show small colored chips next to display name.

## Group B — Lite version this update (full version later)

21. **Voice/video huddles** — WebRTC is a multi-day build (signaling, TURN, UI). I'll add a stub: per-channel "Start huddle" button that opens a Jitsi Meet iframe in a sheet using a deterministic room name. Zero-cost, works today; we can swap to native WebRTC later. (this can be skipped for now and we can dedicate an entire pass through to this later)
22. **Scheduled messages** — `scheduled_messages` table + composer "Schedule…" picker. Posting is done by a pg_cron job every minute that calls a public route to flush due rows. (Free.)
23. **Bot variables** — supports `{user}`, `{channel}`, `{date}`, `{time}` token substitution in rule responses. External URL "call" action deferred.
24. **Inline message translation** — "Translate" item in message menu → Lovable AI Gateway (Gemini Flash Lite, cheap). I'll cache per (message_id, target_lang). Free monthly allowance covers casual use; warn user if rate-limited. (skip if it costs stuff, if there is even a chance it will break bc of limits then skip this for now and we can come up with something else to do something similar later)
25. **AI "summarize since I was last here"** — channel header button. Calls Lovable AI with last 100 messages since your `last_read_at`. Same cost note as above; no user-side key required. (skip if it costs stuff, if there is even a chance it will break bc of limits then skip this for now and we can come up with something else to do something similar later)
26. **Two-factor auth** — Settings page adds "Enable 2FA" using Supabase Auth's TOTP enroll flow (`supabase.auth.mfa.enroll`). Optional, not required. (has several different options for setting up 2FA)

## Group C — Recommend deferring (out of scope this turn)

- Full native WebRTC huddles with screen share (needs TURN server).
- External-API bot actions (security review needed).
- Full app-admin dashboard analytics (start with reports + ban/unban only). (banning/unbanning should be via IP if possible so bad people cant get arround it with another account.)

## Multi-channel bot — your options

For "what channel(s) is this bot in":

- **A. Many-to-many** (chosen): `bot_channels(webhook_id, channel_id)`. Each webhook can post to N channels; rules fire in any of them. Most flexible.
- **B. Wildcard**: a `posts_everywhere` flag on the webhook → bot replies in any channel in the space. Simpler but noisier.
- **C. Per-channel webhook** (today): one webhook = one channel. Simplest, what you have now.

I'll implement **A** and keep B as a checkbox ("Post in all channels").

(i want it to be a combo of a and b, it reads in any channels and responds in the channel where it is fired in or whatever)

## Districts / Organizations (skip for now, just trying to plan ahead) — how I'd do it without it being painful

Think of a **District** (or "Organization" / "Network") as a group of spaces with shared admins.

**Minimal model**

- `districts(id, name, slug, owner_id, created_at)`
- `district_members(district_id, user_id, role)` — role: `admin` | `staff`
- `spaces.district_id` — nullable FK. A space optionally belongs to one district.

**What that unlocks for ~1 day of work**

1. District admins automatically get `manager` permissions in every space attached to their district (via a `has_district_role` security-definer function used in RLS).
2. District-scoped invite codes: join code creates membership in *every* space in the district (think: a school joining all class spaces at once).
3. A **District dashboard** at `/app/d/$slug` listing all spaces, member counts, recent reports, and a "Create space in this district" button.
4. District-wide announcements: a `#announcements` channel auto-created in every child space, write-locked to district admins.
5. District-wide auto-mod / blocked-word inheritance — child spaces can opt-in to the parent's lists.

**Setup flow for a real user (e.g. a school)**

1. Site admin (you) creates the district and assigns the school's IT person as district admin.
2. District admin creates spaces (one per class) from the dashboard — they're auto-attached.
3. Teachers are invited as space owners; students join via the district join code.
4. Reports inside any class space surface in the district dashboard, not just per-space.

**Why this stays easy**

- It's *additive* — `district_id` is nullable, so existing spaces are unaffected.
- Permissions reuse the same `has_role`/`has_space_role` pattern you already trust.
- No new UI primitives — the district dashboard reuses the admin dashboard layout.

**What I'd skip for v1**: cross-district federation, billing tiers per district, custom branding per district. Easy to add later.

---

If this plan looks good, hit approve and I'll start with the migrations (one big one covering all new tables/columns), then knock out the features top-down. I'll batch closely-related ones to keep the diff readable.