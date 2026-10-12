-- Access boundary integration test.
--
-- The unit tests in tests/visibility.test.ts cover the application-layer
-- constraint. This covers the thing that actually protects the data: the
-- can_view_project_asset RLS policy and the default-deny membership rules.
--
-- Read-only. Writes nothing, creates no fixtures. It finds a project that
-- already has both internal and client-visible assets plus a PM and a client,
-- impersonates each role, and raises if anything is visible that should not be.
--
-- Run against a database with the migrations applied:
--   psql "$DATABASE_URL" -f tests/rls/access-boundary.sql
-- or paste into the Supabase SQL editor. It prints NOTICEs and raises on
-- failure, so a clean run means every assertion held.

do $$
declare
  v_project   uuid;
  v_pm        uuid;
  v_client    uuid;
  v_outsider  uuid;
  n           int;
  claims      text;
begin
  -- A project carrying both visibilities, with both roles present.
  select p.id into v_project
  from projects p
  where exists (select 1 from documents d where d.project_id = p.id and d.visibility = 'internal')
    and exists (select 1 from documents d where d.project_id = p.id and d.visibility = 'client_visible')
    and exists (select 1 from photos ph where ph.project_id = p.id and ph.visibility = 'internal')
    and exists (select 1 from project_members m join profiles pr on pr.id = m.user_id
                where m.project_id = p.id and pr.role = 'pm')
    and exists (select 1 from project_members m join profiles pr on pr.id = m.user_id
                where m.project_id = p.id and pr.role = 'client')
  limit 1;

  if v_project is null then
    raise exception
      'No fixture project found. Needs internal and client-visible documents and photos, plus a PM and a client member.';
  end if;

  select m.user_id into v_pm from project_members m join profiles pr on pr.id = m.user_id
   where m.project_id = v_project and pr.role = 'pm' limit 1;

  select m.user_id into v_client from project_members m join profiles pr on pr.id = m.user_id
   where m.project_id = v_project and pr.role = 'client' limit 1;

  -- Somebody with an account who is not on this project at all.
  select pr.id into v_outsider from profiles pr
   where pr.id not in (select user_id from project_members where project_id = v_project)
   limit 1;

  if v_outsider is null then
    raise exception 'No non-member profile available to test the outsider case.';
  end if;

  raise notice 'Fixture project %, pm %, client %, outsider %', v_project, v_pm, v_client, v_outsider;

  ---------------------------------------------------------------------------
  -- A client must not see internal assets.
  ---------------------------------------------------------------------------
  claims := json_build_object('sub', v_client, 'role', 'authenticated')::text;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', claims, true);

  select count(*) into n from documents
   where project_id = v_project and visibility = 'internal';
  execute 'reset role';
  if n <> 0 then
    raise exception 'LEAK: client can read % internal document(s)', n;
  end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from photos
   where project_id = v_project and visibility = 'internal';
  execute 'reset role';
  if n <> 0 then
    raise exception 'LEAK: client can read % internal photo(s)', n;
  end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from activity_events
   where project_id = v_project and visibility = 'internal';
  execute 'reset role';
  if n <> 0 then
    raise exception 'LEAK: client can read % internal activity event(s)', n;
  end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from project_updates
   where project_id = v_project and visibility = 'internal';
  execute 'reset role';
  if n <> 0 then
    raise exception 'LEAK: client can read % internal update(s)', n;
  end if;

  -- And must still see what was published to them, or the test above would
  -- pass simply because the client sees nothing at all.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from documents
   where project_id = v_project and visibility = 'client_visible';
  execute 'reset role';
  if n = 0 then
    raise exception
      'Client sees no client-visible documents either, so the internal check proves nothing.';
  end if;

  raise notice 'client: internal assets hidden, client-visible assets readable';

  ---------------------------------------------------------------------------
  -- The project manager must see both, otherwise the filter is not selective.
  ---------------------------------------------------------------------------
  claims := json_build_object('sub', v_pm, 'role', 'authenticated')::text;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from documents
   where project_id = v_project and visibility = 'internal';
  execute 'reset role';
  if n = 0 then
    raise exception 'Project manager cannot read internal documents on their own project.';
  end if;

  raise notice 'pm: internal assets readable';

  ---------------------------------------------------------------------------
  -- A non-member must see nothing, including the project row itself.
  ---------------------------------------------------------------------------
  claims := json_build_object('sub', v_outsider, 'role', 'authenticated')::text;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', claims, true);
  select
    (select count(*) from projects          where id         = v_project) +
    (select count(*) from documents         where project_id = v_project) +
    (select count(*) from photos            where project_id = v_project) +
    (select count(*) from activity_events   where project_id = v_project) +
    (select count(*) from project_messages  where project_id = v_project) +
    (select count(*) from project_updates   where project_id = v_project) +
    (select count(*) from milestones        where project_id = v_project)
  into n;
  execute 'reset role';
  if n <> 0 then
    raise exception 'LEAK: non-member can read % row(s) belonging to this project', n;
  end if;

  raise notice 'outsider: no rows visible on any table';
  raise notice 'ACCESS BOUNDARY OK';
end $$;
