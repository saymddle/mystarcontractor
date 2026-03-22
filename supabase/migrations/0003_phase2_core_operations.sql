do $$
begin
  if not exists (select 1 from pg_type where typname = 'asset_visibility') then
    create type public.asset_visibility as enum ('internal', 'client_visible');
  end if;

  if not exists (select 1 from pg_type where typname = 'document_category') then
    create type public.document_category as enum (
      'contracts',
      'permits',
      'plans',
      'invoices',
      'change_orders',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'activity_event_type') then
    create type public.activity_event_type as enum (
      'project_created',
      'client_assigned',
      'milestone_created',
      'milestone_updated',
      'document_uploaded',
      'photo_uploaded'
    );
  end if;
end $$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  category public.document_category not null default 'other',
  visibility public.asset_visibility not null default 'internal',
  file_path text not null,
  file_name text not null,
  content_type text,
  file_size bigint,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  uploaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  caption text,
  area text,
  visibility public.asset_visibility not null default 'internal',
  file_path text not null,
  file_name text not null,
  content_type text,
  file_size bigint,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  uploaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type public.activity_event_type not null,
  visibility public.asset_visibility not null default 'internal',
  title text not null,
  detail text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where projects.id = target_project_id
      and projects.organization_id = public.current_organization_id()
      and public.current_role() = 'pm'
  );
$$;

create or replace function public.can_view_project_asset(
  target_project_id uuid,
  target_visibility public.asset_visibility
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_project(target_project_id)
    or (
      target_visibility = 'client_visible'
      and public.is_project_member(target_project_id)
    );
$$;

alter table public.documents enable row level security;
alter table public.photos enable row level security;
alter table public.activity_events enable row level security;

create policy "project viewers can read documents by visibility"
on public.documents
for select
using (
  public.can_view_project_asset(project_id, visibility)
);

create policy "project managers can manage documents"
on public.documents
for all
using (
  public.can_manage_project(project_id)
)
with check (
  public.can_manage_project(project_id)
);

create policy "project viewers can read photos by visibility"
on public.photos
for select
using (
  public.can_view_project_asset(project_id, visibility)
);

create policy "project managers can manage photos"
on public.photos
for all
using (
  public.can_manage_project(project_id)
)
with check (
  public.can_manage_project(project_id)
);

create policy "project viewers can read activity by visibility"
on public.activity_events
for select
using (
  public.can_view_project_asset(project_id, visibility)
);

create policy "project managers can manage activity"
on public.activity_events
for all
using (
  public.can_manage_project(project_id)
)
with check (
  public.can_manage_project(project_id)
);
