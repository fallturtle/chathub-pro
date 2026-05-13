
create extension if not exists pgcrypto;

create type public.app_role as enum ('user', 'admin');
create type public.space_role as enum ('member', 'manager', 'owner');
create type public.channel_kind as enum ('general', 'announcement', 'rules', 'links', 'locked');
create type public.space_visibility as enum ('public', 'private');
create type public.mention_all_policy as enum ('owners', 'managers', 'everyone');
create type public.poll_kind as enum ('single', 'multi', 'ranked');
create type public.theme_pref as enum ('system', 'light', 'dark');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  description text default '',
  avatar_url text,
  avatar_color text default '#7c3aed',
  status_text text default '',
  status_emoji text default '',
  theme_pref public.theme_pref default 'system',
  prefs jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index profiles_username_idx on public.profiles (lower(username));

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text default '',
  icon_url text,
  icon_emoji text default '💬',
  icon_bg text default '#7c3aed',
  visibility public.space_visibility not null default 'private',
  join_code text unique not null default substr(md5(random()::text), 1, 8),
  mention_all_policy public.mention_all_policy not null default 'managers',
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz default now()
);
create index spaces_visibility_idx on public.spaces (visibility);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.space_role not null default 'member',
  muted_until timestamptz,
  banned boolean not null default false,
  joined_at timestamptz default now(),
  primary key (space_id, user_id)
);
create index space_members_user_idx on public.space_members (user_id);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null,
  topic text default '',
  type public.channel_kind not null default 'general',
  position int not null default 0,
  password_hash text,
  body jsonb,
  created_at timestamptz default now()
);
create index channels_space_idx on public.channels (space_id, position);

create table public.channel_access (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unlocked_at timestamptz default now(),
  primary key (channel_id, user_id)
);

create table public.channel_notifications (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null default 'all',
  last_read_at timestamptz default now(),
  primary key (channel_id, user_id)
);

create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table public.dm_participants (
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (thread_id, user_id)
);
create index dm_participants_user_idx on public.dm_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  dm_thread_id uuid references public.dm_threads(id) on delete cascade,
  parent_id uuid references public.messages(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  edited_at timestamptz,
  deleted_at timestamptz,
  pinned boolean default false,
  created_at timestamptz default now(),
  search tsvector generated always as (to_tsvector('simple', coalesce(body, ''))) stored,
  check ((channel_id is not null) <> (dm_thread_id is not null))
);
create index messages_channel_idx on public.messages (channel_id, created_at desc);
create index messages_dm_idx on public.messages (dm_thread_id, created_at desc);
create index messages_parent_idx on public.messages (parent_id);
create index messages_search_idx on public.messages using gin (search);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  url text not null,
  mime text,
  name text,
  size int,
  width int,
  height int,
  kind text default 'file'
);

create table public.reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  primary key (message_id, user_id, emoji)
);

create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  target text not null,
  user_id uuid references auth.users(id) on delete cascade
);
create index mentions_msg_idx on public.mentions (message_id);
create index mentions_user_idx on public.mentions (user_id);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.messages(id) on delete cascade,
  question text not null,
  kind public.poll_kind not null default 'single',
  closes_at timestamptz
);
create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position int default 0
);
create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank int default 1,
  primary key (poll_id, option_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null,
  description text default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'going',
  primary key (event_id, user_id)
);

create table public.filters_blocked (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  word text not null,
  unique (space_id, word)
);

create table public.filters_rate (
  space_id uuid primary key references public.spaces(id) on delete cascade,
  enabled boolean default false,
  max_msgs int default 5,
  window_seconds int default 10,
  mute_seconds int default 300
);

create table public.strikes (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  count int default 0,
  last_at timestamptz default now(),
  primary key (space_id, user_id)
);

create table public.custom_tags (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  color text default '#7c3aed',
  unique (space_id, user_id, label)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  meta jsonb default '{}'::jsonb,
  at timestamptz default now()
);

create table public.invites (
  code text primary key,
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  max_uses int,
  uses int default 0,
  created_at timestamptz default now()
);

create table public.typing (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  dm_thread_id uuid references public.dm_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz default now()
);
create unique index typing_channel_user on public.typing (channel_id, user_id) where channel_id is not null;
create unique index typing_dm_user on public.typing (dm_thread_id, user_id) where dm_thread_id is not null;

-- Helpers
create or replace function public.is_space_member(_space uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.space_members where space_id = _space and user_id = _user and not banned);
$$;

create or replace function public.has_space_role(_space uuid, _user uuid, _min public.space_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.space_members sm
    where sm.space_id = _space and sm.user_id = _user and not sm.banned
      and case _min
        when 'member' then true
        when 'manager' then sm.role in ('manager','owner')
        when 'owner' then sm.role = 'owner'
      end
  );
$$;

create or replace function public.is_dm_participant(_thread uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dm_participants where thread_id = _thread and user_id = _user);
$$;

create or replace function public.message_visible(_msg public.messages, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when _msg.channel_id is not null then exists (
      select 1 from public.channels c
      where c.id = _msg.channel_id
        and public.is_space_member(c.space_id, _user)
        and (c.type <> 'locked'
             or exists (select 1 from public.channel_access ca where ca.channel_id = c.id and ca.user_id = _user)
             or public.has_space_role(c.space_id, _user, 'manager'))
    )
    when _msg.dm_thread_id is not null then public.is_dm_participant(_msg.dm_thread_id, _user)
    else false
  end;
$$;

-- Auth trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare uname text; base text; i int := 0;
begin
  base := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1), 'user');
  base := regexp_replace(lower(base), '[^a-z0-9_]+', '', 'g');
  if length(base) < 2 then base := 'user'; end if;
  uname := base;
  while exists (select 1 from public.profiles where lower(username) = lower(uname)) loop
    i := i + 1;
    uname := base || i::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, coalesce(new.raw_user_meta_data->>'display_name', uname));
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Space bootstrap
create or replace function public.bootstrap_space()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.space_members (space_id, user_id, role)
    values (new.id, new.owner_id, 'owner') on conflict do nothing;
  insert into public.channels (space_id, name, type, position) values
    (new.id, 'general', 'general', 0),
    (new.id, 'announcements', 'announcement', 1),
    (new.id, 'rules', 'rules', 2),
    (new.id, 'links', 'links', 3);
  insert into public.filters_rate (space_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger spaces_after_insert after insert on public.spaces
  for each row execute function public.bootstrap_space();

-- RLS enable
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.channels enable row level security;
alter table public.channel_access enable row level security;
alter table public.channel_notifications enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_participants enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.reactions enable row level security;
alter table public.mentions enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.filters_blocked enable row level security;
alter table public.filters_rate enable row level security;
alter table public.strikes enable row level security;
alter table public.custom_tags enable row level security;
alter table public.audit_log enable row level security;
alter table public.invites enable row level security;
alter table public.typing enable row level security;

-- Policies
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy user_roles_read_self on public.user_roles for select to authenticated using (user_id = auth.uid());

create policy spaces_select on public.spaces for select to authenticated using (
  visibility = 'public' or public.is_space_member(id, auth.uid())
);
create policy spaces_insert on public.spaces for insert to authenticated with check (owner_id = auth.uid());
create policy spaces_update on public.spaces for update to authenticated
  using (public.has_space_role(id, auth.uid(), 'manager'))
  with check (public.has_space_role(id, auth.uid(), 'manager'));
create policy spaces_delete_owner on public.spaces for delete to authenticated using (owner_id = auth.uid());

create policy members_select on public.space_members for select to authenticated using (
  public.is_space_member(space_id, auth.uid()) or user_id = auth.uid()
);
create policy members_insert on public.space_members for insert to authenticated with check (
  user_id = auth.uid() or public.has_space_role(space_id, auth.uid(), 'manager')
);
create policy members_update on public.space_members for update to authenticated using (
  public.has_space_role(space_id, auth.uid(), 'manager')
);
create policy members_delete on public.space_members for delete to authenticated using (
  user_id = auth.uid() or public.has_space_role(space_id, auth.uid(), 'manager')
);

create policy channels_select on public.channels for select to authenticated using (public.is_space_member(space_id, auth.uid()));
create policy channels_write on public.channels for all to authenticated
  using (public.has_space_role(space_id, auth.uid(), 'manager'))
  with check (public.has_space_role(space_id, auth.uid(), 'manager'));

create policy ca_select_self on public.channel_access for select to authenticated using (user_id = auth.uid());
create policy ca_insert_self on public.channel_access for insert to authenticated with check (user_id = auth.uid());

create policy cn_all_self on public.channel_notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy dm_threads_select on public.dm_threads for select to authenticated using (public.is_dm_participant(id, auth.uid()));
create policy dm_threads_insert on public.dm_threads for insert to authenticated with check (true);

create policy dmp_select on public.dm_participants for select to authenticated using (public.is_dm_participant(thread_id, auth.uid()));
create policy dmp_insert on public.dm_participants for insert to authenticated with check (true);
create policy dmp_update_self on public.dm_participants for update to authenticated using (user_id = auth.uid());

create policy messages_select on public.messages for select to authenticated using (public.message_visible(messages, auth.uid()));
create policy messages_insert on public.messages for insert to authenticated with check (
  author_id = auth.uid() and (
    (channel_id is not null and exists (
      select 1 from public.channels c
      where c.id = channel_id
        and public.is_space_member(c.space_id, auth.uid())
        and (c.type <> 'announcement' or public.has_space_role(c.space_id, auth.uid(), 'manager'))
        and (c.type <> 'locked'
             or exists (select 1 from public.channel_access ca where ca.channel_id = c.id and ca.user_id = auth.uid())
             or public.has_space_role(c.space_id, auth.uid(), 'manager'))
        and not exists (
          select 1 from public.space_members sm
          where sm.space_id = c.space_id and sm.user_id = auth.uid()
            and (sm.banned or (sm.muted_until is not null and sm.muted_until > now()))
        )
    ))
    or
    (dm_thread_id is not null and public.is_dm_participant(dm_thread_id, auth.uid()))
  )
);
create policy messages_update_author on public.messages for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy messages_delete on public.messages for delete to authenticated using (
  author_id = auth.uid()
  or (channel_id is not null and exists (
    select 1 from public.channels c
    where c.id = channel_id and public.has_space_role(c.space_id, auth.uid(), 'manager')
  ))
);

create policy att_select on public.attachments for select to authenticated using (
  exists (select 1 from public.messages m where m.id = message_id and public.message_visible(m, auth.uid()))
);
create policy att_write on public.attachments for insert to authenticated with check (
  exists (select 1 from public.messages m where m.id = message_id and m.author_id = auth.uid())
);
create policy att_delete on public.attachments for delete to authenticated using (
  exists (select 1 from public.messages m where m.id = message_id and m.author_id = auth.uid())
);

create policy react_select on public.reactions for select to authenticated using (
  exists (select 1 from public.messages m where m.id = message_id and public.message_visible(m, auth.uid()))
);
create policy react_write on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy react_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

create policy mentions_select on public.mentions for select to authenticated using (
  exists (select 1 from public.messages m where m.id = message_id and public.message_visible(m, auth.uid()))
);
create policy mentions_write on public.mentions for insert to authenticated with check (
  exists (select 1 from public.messages m where m.id = message_id and m.author_id = auth.uid())
);

create policy polls_select on public.polls for select to authenticated using (
  exists (select 1 from public.messages m where m.id = message_id and public.message_visible(m, auth.uid()))
);
create policy polls_write on public.polls for insert to authenticated with check (
  exists (select 1 from public.messages m where m.id = message_id and m.author_id = auth.uid())
);
create policy popts_select on public.poll_options for select to authenticated using (
  exists (select 1 from public.polls p join public.messages m on m.id = p.message_id where p.id = poll_id and public.message_visible(m, auth.uid()))
);
create policy popts_write on public.poll_options for insert to authenticated with check (
  exists (select 1 from public.polls p join public.messages m on m.id = p.message_id where p.id = poll_id and m.author_id = auth.uid())
);
create policy pvotes_select on public.poll_votes for select to authenticated using (
  exists (select 1 from public.polls p join public.messages m on m.id = p.message_id where p.id = poll_id and public.message_visible(m, auth.uid()))
);
create policy pvotes_write on public.poll_votes for insert to authenticated with check (user_id = auth.uid());
create policy pvotes_delete on public.poll_votes for delete to authenticated using (user_id = auth.uid());

create policy events_select on public.events for select to authenticated using (public.is_space_member(space_id, auth.uid()));
create policy events_insert on public.events for insert to authenticated with check (
  created_by = auth.uid() and public.is_space_member(space_id, auth.uid())
);
create policy events_update on public.events for update to authenticated using (
  created_by = auth.uid() or public.has_space_role(space_id, auth.uid(), 'manager')
);
create policy events_delete on public.events for delete to authenticated using (
  created_by = auth.uid() or public.has_space_role(space_id, auth.uid(), 'manager')
);
create policy rsvps_select on public.event_rsvps for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and public.is_space_member(e.space_id, auth.uid()))
);
create policy rsvps_write on public.event_rsvps for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy fb_select on public.filters_blocked for select to authenticated using (public.is_space_member(space_id, auth.uid()));
create policy fb_write on public.filters_blocked for all to authenticated using (public.has_space_role(space_id, auth.uid(), 'manager')) with check (public.has_space_role(space_id, auth.uid(), 'manager'));

create policy fr_select on public.filters_rate for select to authenticated using (public.is_space_member(space_id, auth.uid()));
create policy fr_write on public.filters_rate for all to authenticated using (public.has_space_role(space_id, auth.uid(), 'manager')) with check (public.has_space_role(space_id, auth.uid(), 'manager'));

create policy strikes_select on public.strikes for select to authenticated using (
  user_id = auth.uid() or public.has_space_role(space_id, auth.uid(), 'manager')
);

create policy ct_select on public.custom_tags for select to authenticated using (public.is_space_member(space_id, auth.uid()));
create policy ct_write on public.custom_tags for all to authenticated using (public.has_space_role(space_id, auth.uid(), 'manager')) with check (public.has_space_role(space_id, auth.uid(), 'manager'));

create policy audit_select on public.audit_log for select to authenticated using (
  space_id is not null and public.has_space_role(space_id, auth.uid(), 'manager')
);

create policy inv_select on public.invites for select to authenticated using (true);
create policy inv_write on public.invites for all to authenticated using (public.has_space_role(space_id, auth.uid(), 'manager')) with check (public.has_space_role(space_id, auth.uid(), 'manager'));

create policy typing_select on public.typing for select to authenticated using (
  (channel_id is not null and exists (select 1 from public.channels c where c.id = channel_id and public.is_space_member(c.space_id, auth.uid())))
  or (dm_thread_id is not null and public.is_dm_participant(dm_thread_id, auth.uid()))
);
create policy typing_write on public.typing for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.attachments;
alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.typing;
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.space_members;
alter publication supabase_realtime add table public.events;

alter table public.messages replica identity full;
alter table public.reactions replica identity full;
alter table public.typing replica identity full;
alter table public.channels replica identity full;
alter table public.space_members replica identity full;

-- Storage buckets
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('spaces', 'spaces', true) on conflict do nothing;

create policy "att_read" on storage.objects for select to authenticated using (bucket_id = 'attachments');
create policy "att_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "att_del" on storage.objects for delete to authenticated using (
  bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "av_read" on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "av_ins" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "av_upd" on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "sp_read" on storage.objects for select to authenticated using (bucket_id = 'spaces');
create policy "sp_ins" on storage.objects for insert to authenticated with check (bucket_id = 'spaces');
create policy "sp_upd" on storage.objects for update to authenticated using (bucket_id = 'spaces');
