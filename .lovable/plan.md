# Artistry Hub — Chat Platform Plan

A Discord/Google Chat hybrid built in one pass to minimize credits. Phasing would mean re-loading context across multiple builds (more expensive). One large build is more credit-efficient *if* the plan is tight — that's what this is.

## Decisions locked in from your answers

- **Auth**: email + password + username. Email is for password recovery only; the app shows usernames everywhere. Login is by username **or** email + password.
- **Theme**: defaults to system preference, falls back to dark. Each user can override in settings (light / dark / system).
- **Bot**: embedded Google Chat–style. Your uploaded HTML controller renders inside a "Bot" sidebar panel per space (iframe + `postMessage` bridge so it can read the current space/user). It keeps talking to *your* Apps Script Web App URL — no backend rewrite needed. Owners paste the Apps Script URL + auth token in space settings. (We can talk about deeper native integration later if you want.)
- **Sequencing**: everything in one build.

## Stack

- TanStack Start (already set up)
- Lovable Cloud (Postgres + Auth + Storage + Realtime)
- Tailwind + shadcn for UI, Framer Motion for subtle motion
- Realtime via Cloud's Postgres changes channels (no polling)

## Data model (Cloud tables)

```text
profiles            id, username (unique), display_name, description, avatar_url,
                    avatar_color, status_text, status_emoji, theme_pref, prefs jsonb
user_roles          user_id, role (global: 'user'|'admin')   -- separate table, never on profiles
spaces              id, name, slug, description, icon_url, icon_emoji, icon_bg,
                    visibility ('public'|'private'), join_code, mention_all_policy
                    ('owners'|'managers'|'everyone'), owner_id, created_at
space_members       space_id, user_id, role ('owner'|'manager'|'member'),
                    muted_until, banned, joined_at  (PK: space_id+user_id)
channels            id, space_id, name, type ('general'|'announcement'|'rules'
                    |'links'|'locked'), password_hash, position, topic
channel_access      channel_id, user_id   -- unlocked locked-channels per user
messages            id, channel_id (nullable), dm_thread_id (nullable), parent_id
                    (thread root), author_id, body, body_rich jsonb, edited_at,
                    deleted_at, created_at
attachments         id, message_id, url, mime, name, size
reactions           message_id, user_id, emoji   (PK all three)
polls               id, message_id, question, kind ('single'|'multi'|'ranked'),
                    closes_at
poll_options        id, poll_id, label
poll_votes          poll_id, option_id, user_id, rank
dm_threads          id, created_at
dm_participants     thread_id, user_id
mentions            message_id, target ('all'|'user'), user_id
events              id, space_id, title, description, starts_at, ends_at,
                    created_by, location
event_rsvps         event_id, user_id, status
filters_blocked     space_id, word
filters_rate        space_id, max_msgs, window_seconds, mute_seconds
strikes             space_id, user_id, count, last_at
custom_tags         space_id, user_id, label, color
bot_configs         space_id, apps_script_url, auth_token, html_url (optional)
audit_log           id, space_id, actor_id, action, target, at, meta jsonb
```

RLS on every table. Role checks via `has_space_role(space_id, user_id, min_role)` SECURITY DEFINER function — no recursion.

## Routes

```text
/                            landing (public)
/login, /signup, /reset-password
/_authenticated/
  app                        shell with sidebar (spaces) + main pane
  app/dm/$threadId
  app/s/$spaceId             redirects to first channel
  app/s/$spaceId/c/$channelId
  app/s/$spaceId/events
  app/s/$spaceId/members
  app/s/$spaceId/settings
  app/s/$spaceId/bot
  app/browse                 public spaces directory + "join by code"
  app/settings               user profile/prefs/password/theme
```

## Feature mapping

- **Realtime** — Cloud channel subscription per open channel/DM; new messages stream in. Reactions, edits, deletes, presence broadcast through the same channel.
- **Channel types** — `general` (everyone posts), `announcement` (only owners/managers post; everyone reads), `rules`/`links` (managed pages, owner/manager edits a pinned doc-style block), `locked` (password modal → record in `channel_access`, password is bcrypt-hashed server-side via a server function).
- **Roles & moderation** — promote/demote/mute/ban/kick via server functions that check `has_space_role`. Add member by username (lookup → insert into `space_members`). Owner-only: delete space, change `mention_all_policy`, transfer ownership.
- **@all / @user** — parsed on send, written into `mentions`. `@all` rejected by server fn if caller's role doesn't satisfy the space's policy.
- **Chat filters** — blocked words replaced with `####` at render time *and* stored sanitized. Suggested-words button seeds the list with a curated profanity set. Rate limiter: server fn checks recent message count per user/channel; on trip → set `muted_until` and notify. Strikes table tracks repeat offenders.
- **Polls** — single-choice, multi-choice, and ranked (drag to reorder). Live vote counts via realtime.
- **Threads/replies** — `parent_id` self-reference; thread panel slides in on right.
- **Files/images/GIFs/stickers** — Cloud Storage bucket `attachments` (public read, authed write, RLS by space membership). GIF picker via Tenor (free public API, key as a public secret). Stickers = curated Cloud-hosted set + per-space custom stickers.
- **Emoji + reactions** — emoji-mart picker.
- **Rich text** — `{bold text}`, `{italic text}`, `{code text}`, `{red:colored text}` parsed to safe React nodes (no `dangerouslySetInnerHTML`).
- **Smart grouping** — consecutive messages from same author within 5 min collapse into one bubble with one avatar/timestamp.
- **Search** — Postgres `tsvector` index on `messages.body`; searchable from a top bar (current space scope or global).
- **Members list** — per-space drawer; copy-username button on each row.
- **Custom tags** — space owners/managers assign colored tags to members; render next to username.
- **Status** — set in user settings, shown in DMs and on hover cards.
- **Events** — per-space calendar view (month + agenda) with RSVPs.
- **Browse public spaces** — searchable grid; "Join by code" tab in same dialog.
- **Space identity** — owner can swap between uploaded image OR emoji + background color.
- **Notifications** — in-app toast + unread badges; browser Notification API when tab unfocused.

## Bot integration (your Apps Script + HTML)

- Owner opens **Space → Bot** and pastes the Apps Script Web App URL + auth token. Stored in `bot_configs` (token encrypted at rest via Cloud).
- Bot panel renders the uploaded HTML in a sandboxed iframe. We host your HTML at `public/bot/artistry-hub.html` and inject the configured URL/token via `postMessage` so it doesn't have to be edited.
- The bot can post into the current channel via a server function that proxies to the Apps Script webhook (so the token never reaches the browser).
- Slash-command surface: typing `/` in a channel opens a command palette wired to the same Apps Script `action` endpoints (warning, mute, etc.) when a bot is configured.

## Suggestions worth adding (low extra cost)

- **Pinned messages** per channel
- **Read receipts / unread markers** ("New" line where you left off)
- **Drafts** persisted per channel
- **Slash commands beyond bot**: `/me`, `/shrug`, `/poll`, `/event`
- **Invite links** with optional expiry/uses (in addition to join codes)
- **Per-channel notification level** (all / mentions / muted)
- **Soft-delete + audit log** so owners can review deleted messages

Want any of these dropped to save credits, or all included?

Include all, also include a thing like in google chat where when someone is typing it says person is typing and replaces person with that persons name or if too many people are typing it says many people are typing. For the html bot thing only owners and managers can access that one, can it just be auto set up there so that nothing has to be done for it? if not we will not do that part for now and we can do all the bot stuff in a later update. Have users be able to delete their own messages and managers can delete regular members messages as well, owners can delete anyones. "GIFs need a Tenor API key (free). I'll ask for it when we hit that step." when we get to that step please give me clear instructions on what to do. also lets just not do the bot thing yet, we can add that in a later update, that way we are saving some credits and lowing the risk a bit. do the slash commands idea you came up with tho. Please do as much testing as you can do without costing extra credits if possible that way it can just work the first try.

## Build order inside the single pass

1. Enable Cloud, schema + RLS + roles function + storage bucket
2. Auth (email+username signup, login by either, reset)
3. App shell, theme system, user settings
4. Spaces + channels + membership + role tools
5. Messaging + realtime + smart grouping + rich text + mentions
6. Reactions, threads, attachments, GIFs/stickers, polls
7. Filters (blocked words + rate limit + strikes), moderation actions
8. Events calendar, search, members list, custom tags, status
9. Browse public + join-by-code, space identity editor
10. Bot panel + Apps Script proxy + slash commands
11. Polish, empty states, error boundaries, SEO meta

## Risk / honest caveats

- This is a *very* large build for one pass. If a single step errors, fixing it costs additional credits. I'll keep components small and isolated to limit blast radius.
- GIFs need a Tenor API key (free). I'll ask for it when we hit that step.
- Bot panel assumes your Apps Script Web App is deployed "Anyone with link". No changes to your script required.

Approve to start, or tell me what to cut/add.