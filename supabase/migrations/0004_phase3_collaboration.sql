do $$
begin
  begin
    alter type public.activity_event_type add value if not exists 'update_published';
  exception
    when duplicate_object then null;
  end;

  if not exists (select 1 from pg_type where typname = 'notification_kind') then
    create type public.notification_kind as enum ('message', 'update');
  end if;
end $$;

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_message_reads (
  message_id uuid not null references public.project_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id)
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  body text not null,
  visibility public.asset_visibility not null default 'client_visible',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  detail text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.project_messages enable row level security;
alter table public.project_message_reads enable row level security;
alter table public.project_updates enable row level security;
alter table public.notifications enable row level security;

create policy "project members can read messages"
on public.project_messages
for select
using (
  public.is_project_member(project_id) or public.can_manage_project(project_id)
);

create policy "project members can send messages"
on public.project_messages
for insert
with check (
  sender_id = auth.uid()
  and (public.is_project_member(project_id) or public.can_manage_project(project_id))
);

create policy "users can read their message reads"
on public.project_message_reads
for select
using (user_id = auth.uid());

create policy "users can mark message reads"
on public.project_message_reads
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.project_messages
    where project_messages.id = project_message_reads.message_id
      and (public.is_project_member(project_messages.project_id) or public.can_manage_project(project_messages.project_id))
  )
);

create policy "project viewers can read published updates"
on public.project_updates
for select
using (
  public.can_view_project_asset(project_id, visibility)
);

create policy "project managers can manage updates"
on public.project_updates
for all
using (
  public.can_manage_project(project_id)
)
with check (
  public.can_manage_project(project_id)
);

create policy "users can read own notifications"
on public.notifications
for select
using (user_id = auth.uid());

create policy "users can mark own notifications read"
on public.notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
