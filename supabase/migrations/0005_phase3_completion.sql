do $$
begin
  if not exists (select 1 from pg_type where typname = 'invite_status') then
    create type public.invite_status as enum (
      'pending',
      'accepted',
      'revoked',
      'expired'
    );
  end if;
end $$;

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  token text not null unique,
  status public.invite_status not null default 'pending',
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_invites_project_id_idx
on public.project_invites (project_id);

create index if not exists project_invites_email_idx
on public.project_invites (email);

create or replace function public.process_project_invites_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  select invites.project_id, new.id, 'client'::public.user_role
  from public.project_invites as invites
  where invites.organization_id = new.organization_id
    and lower(invites.email) = lower(new.email)
    and invites.status = 'pending'
    and (invites.expires_at is null or invites.expires_at > timezone('utc', now()))
  on conflict (project_id, user_id) do nothing;

  update public.project_invites
  set status = 'accepted',
      accepted_at = timezone('utc', now()),
      accepted_by = new.id
  where organization_id = new.organization_id
    and lower(email) = lower(new.email)
    and status = 'pending'
    and (expires_at is null or expires_at > timezone('utc', now()));

  return new;
end;
$$;

drop trigger if exists process_project_invites_for_profile_trigger on public.profiles;

create trigger process_project_invites_for_profile_trigger
  after insert on public.profiles
  for each row execute procedure public.process_project_invites_for_profile();

alter table public.project_invites enable row level security;

create policy "project managers can read project invites"
on public.project_invites
for select
using (
  public.can_manage_project(project_id)
);

create policy "project managers can create project invites"
on public.project_invites
for insert
with check (
  public.can_manage_project(project_id)
  and organization_id = public.current_organization_id()
);

create policy "project managers can update project invites"
on public.project_invites
for update
using (
  public.can_manage_project(project_id)
)
with check (
  public.can_manage_project(project_id)
);
