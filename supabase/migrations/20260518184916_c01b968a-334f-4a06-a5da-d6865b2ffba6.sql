-- DM requests: accepted flag on participants
alter table public.dm_participants add column if not exists accepted boolean not null default true;

-- Member tag assignments
create table if not exists public.member_tags (
  space_id uuid not null,
  user_id uuid not null,
  tag_id uuid not null,
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  primary key (space_id, user_id, tag_id)
);
alter table public.member_tags enable row level security;

drop policy if exists mt_select on public.member_tags;
create policy mt_select on public.member_tags
  for select to authenticated
  using (public.is_space_member(space_id, auth.uid()));

drop policy if exists mt_write on public.member_tags;
create policy mt_write on public.member_tags
  for all to authenticated
  using (public.has_space_role(space_id, auth.uid(), 'manager'))
  with check (public.has_space_role(space_id, auth.uid(), 'manager'));