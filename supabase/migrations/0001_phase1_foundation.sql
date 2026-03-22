create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('pm', 'client');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum (
      'not_started',
      'in_progress',
      'blocked',
      'complete'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'milestone_status') then
    create type public.milestone_status as enum (
      'not_started',
      'in_progress',
      'blocked',
      'complete'
    );
  end if;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  location text,
  status public.project_status not null default 'not_started',
  start_date date,
  target_end_date date,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(project_id, user_id)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status public.milestone_status not null default 'not_started',
  percent_complete integer not null default 0 check (percent_complete between 0 and 100),
  due_date date,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.normalize_slug(source text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(source, '')), '[^a-zA-Z0-9]+', '-', 'g'));
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  organization_id uuid;
  requested_slug text;
  requested_name text;
begin
  requested_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'client');
  requested_slug := public.normalize_slug(new.raw_user_meta_data ->> 'organization_slug');
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'organization_name'), '');

  if requested_role = 'pm' then
    if requested_name is null then
      raise exception 'Project manager sign-up requires organization_name';
    end if;

    if requested_slug = '' then
      requested_slug := public.normalize_slug(requested_name);
    end if;

    insert into public.organizations (name, slug, created_by)
    values (
      requested_name,
      requested_slug,
      new.id
    )
    returning id into organization_id;
  else
    if requested_slug = '' then
      raise exception 'Client sign-up requires organization_slug';
    end if;

    select id
      into organization_id
    from public.organizations
    where slug = requested_slug;

    if organization_id is null then
      raise exception 'Organization with slug % was not found', requested_slug;
    end if;
  end if;

  insert into public.profiles (id, organization_id, email, full_name, role)
  values (
    new.id,
    organization_id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    requested_role
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.validate_project_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_org_id uuid;
  profile_org_id uuid;
  profile_role public.user_role;
begin
  select organization_id into project_org_id
  from public.projects
  where id = new.project_id;

  select organization_id, role into profile_org_id, profile_role
  from public.profiles
  where id = new.user_id;

  if project_org_id is null or profile_org_id is null then
    raise exception 'Project member validation failed';
  end if;

  if project_org_id <> profile_org_id then
    raise exception 'Project members must belong to the same organization as the project';
  end if;

  if profile_role <> new.role then
    raise exception 'Membership role must match the profile role';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_project_member_trigger on public.project_members;

create trigger validate_project_member_trigger
  before insert or update on public.project_members
  for each row execute procedure public.validate_project_member();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.milestones enable row level security;

create policy "organization members can read their organization"
on public.organizations
for select
using (
  id = public.current_organization_id()
);

create policy "project managers can update their organization"
on public.organizations
for update
using (
  id = public.current_organization_id()
  and public.current_role() = 'pm'
);

create policy "users can read profiles in their organization"
on public.profiles
for select
using (
  organization_id = public.current_organization_id()
);

create policy "users can update their own profile"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "project managers can create projects"
on public.projects
for insert
with check (
  projects.organization_id = public.current_organization_id()
  and public.current_role() = 'pm'
);

create policy "project managers can read org projects and clients can read assigned projects"
on public.projects
for select
using (
  (
    projects.organization_id = public.current_organization_id()
    and public.current_role() = 'pm'
  )
  or exists (
    select 1
    from public.project_members
    where project_members.project_id = projects.id
      and project_members.user_id = auth.uid()
  )
);

create policy "project managers can update projects in their organization"
on public.projects
for update
using (
  projects.organization_id = public.current_organization_id()
  and public.current_role() = 'pm'
);

create policy "project managers can manage membership"
on public.project_members
for insert
with check (
  exists (
    select 1
    from public.projects
    join public.profiles
      on profiles.organization_id = projects.organization_id
    where projects.id = project_members.project_id
      and profiles.id = auth.uid()
      and profiles.role = 'pm'
  )
);

create policy "project members can read project membership"
on public.project_members
for select
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_members.project_id
      and (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organization_id = projects.organization_id
            and profiles.role = 'pm'
        )
        or project_members.user_id = auth.uid()
        or exists (
          select 1
          from public.project_members assigned
          where assigned.project_id = project_members.project_id
            and assigned.user_id = auth.uid()
        )
      )
  )
);

create policy "project managers can delete membership"
on public.project_members
for delete
using (
  exists (
    select 1
    from public.projects
    join public.profiles
      on profiles.organization_id = projects.organization_id
    where projects.id = project_members.project_id
      and profiles.id = auth.uid()
      and profiles.role = 'pm'
  )
);

create policy "project viewers can read milestones"
on public.milestones
for select
using (
  exists (
    select 1
    from public.projects
    where projects.id = milestones.project_id
      and (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.organization_id = projects.organization_id
            and profiles.role = 'pm'
        )
        or exists (
          select 1
          from public.project_members
          where project_members.project_id = milestones.project_id
            and project_members.user_id = auth.uid()
        )
      )
  )
);

create policy "project managers can manage milestones"
on public.milestones
for all
using (
  exists (
    select 1
    from public.projects
    join public.profiles
      on profiles.organization_id = projects.organization_id
    where projects.id = milestones.project_id
      and profiles.id = auth.uid()
      and profiles.role = 'pm'
  )
)
with check (
  exists (
    select 1
    from public.projects
    join public.profiles
      on profiles.organization_id = projects.organization_id
    where projects.id = milestones.project_id
      and profiles.id = auth.uid()
      and profiles.role = 'pm'
  )
);
