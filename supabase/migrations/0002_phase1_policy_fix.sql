create or replace function public.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members
    where project_members.project_id = target_project_id
      and project_members.user_id = auth.uid()
  );
$$;

drop policy if exists "project managers can read org projects and clients can read assigned projects"
on public.projects;

create policy "project managers can read org projects and clients can read assigned projects"
on public.projects
for select
using (
  (
    projects.organization_id = public.current_organization_id()
    and public.current_role() = 'pm'
  )
  or public.is_project_member(projects.id)
);

drop policy if exists "project members can read project membership"
on public.project_members;

create policy "project members can read project membership"
on public.project_members
for select
using (
  (
    exists (
      select 1
      from public.projects
      where projects.id = project_members.project_id
        and projects.organization_id = public.current_organization_id()
        and public.current_role() = 'pm'
    )
  )
  or project_members.user_id = auth.uid()
  or public.is_project_member(project_members.project_id)
);

drop policy if exists "project viewers can read milestones"
on public.milestones;

create policy "project viewers can read milestones"
on public.milestones
for select
using (
  exists (
    select 1
    from public.projects
    where projects.id = milestones.project_id
      and (
        (
          projects.organization_id = public.current_organization_id()
          and public.current_role() = 'pm'
        )
        or public.is_project_member(milestones.project_id)
      )
  )
);
