# My Star Contractor

Construction management platform for project managers and clients.

## Current status

- Current phase: `Phase 3 complete`
- Overall status: `Phase 3 is implemented, migrated to Supabase, and validated for invites, messaging, updates, notifications, and demo seeding`
- Rule: update this README whenever a phase is completed or the roadmap changes

## Tech stack

- Next.js App Router
- TypeScript
- Supabase
- Vercel for deployment

## Design system

Tokens live at the top of `app/globals.css`. There is no CSS framework and no component library.

- **Palette**: cool graphite base, one saturated signal-orange accent. Light and dark are both
  first-class, driven by `prefers-color-scheme` over semantic tokens. Do not add a colour outside
  the token set.
- **Radius scale**: 10px controls, 14px cards, 18px panels, 999px pills. Nothing else.
- **Type**: `Space Grotesk` for display and body, `JetBrains Mono` for the numeric register
  (percentages, counts, file sizes, dates) via the `.num` class and its aliases.
- **Motion**: hover and active transitions, plus a transform-only scroll reveal on marketing
  sections using native `animation-timeline: view()`. Everything collapses under
  `prefers-reduced-motion: reduce`. No animation library.

`DESIGN_AUDIT.md` records the audit these came out of, including the reasoning behind each
choice and what is still outstanding.

## What exists right now

- Marketing/overview page
- Auth flow for PM and client accounts
- Protected `/app` route tree
- PM/client role-aware dashboard
- Project creation and client assignment flow
- Milestone CRUD in the project workspace
- Document upload and visibility controls
- Photo upload and visibility controls
- Unified activity timeline
- Project-level search and asset filters
- Project-scoped messaging
- Message read tracking
- PM-published project updates
- In-app notifications
- Client invite onboarding flow
- Optional email notifications through Resend-compatible env vars
- Realtime refresh for project collaboration views
- Supabase SSR auth helpers
- Demo seed script for release prep
- Phase 1, Phase 2, and Phase 3 SQL schema and RLS migrations
- Live Supabase project connected and validated

## Phased roadmap

### Phase 1 - Foundation and Access Control

Status: `Complete`

Goal: turn the static shell into a real authenticated app with role separation and project ownership.

Tasks in build order:

1. [x] Define the Supabase data model.
   - Create `organizations`, `profiles`, `projects`, `project_members`, and `milestones`.
   - Lock roles to `pm` and `client`.
   - Associate every user and project to an organization.
2. [x] Set up authentication flow.
   - Build sign-up, sign-in, and sign-out.
   - Bootstrap the user profile on first login.
   - Redirect authenticated users into the app.
3. [x] Enforce authorization and row-level security.
   - PM can manage projects in their organization.
   - Client can only read assigned projects.
   - Default-deny access unless project membership exists.
4. [x] Create the authenticated app shell and route structure.
   - Move from demo routes to real app routes like `/app`, `/app/projects`, and `/app/projects/[projectId]`.
   - Render PM and client views from the same protected app tree.
5. [x] Build project creation and assignment.
   - PM can create a project with core metadata.
   - PM can assign one or more clients to the project.
6. [x] Build the first real dashboard.
   - PM dashboard shows active projects and recent activity.
   - Client dashboard shows assigned projects and published updates.

Completed validation:

- [x] Applied `0001_phase1_foundation.sql` to the live Supabase project
- [x] Applied `0002_phase1_policy_fix.sql` to fix recursive membership policy logic
- [x] Verified live PM account creation and organization bootstrap
- [x] Verified live client account creation and organization attachment
- [x] Verified PM project creation and client assignment
- [x] Verified client can only see assigned projects

Definition of done:

- PM can sign in, create a project, and assign a client.
- Client can sign in and only see assigned project data.
- Access is enforced in both UI and database policies.

### Phase 2 - Core Project Operations

Status: `Complete`

Goal: make the platform operational for real construction project management.

Tasks in build order:

1. [x] Build milestone and progress tracking.
   - Add milestone CRUD under each project.
   - Track status, due date, notes, and percent complete.
   - Derive overall project completion from milestone progress.
2. [x] Build document management.
   - Create `documents` table and storage bucket.
   - Add metadata, categories, and visibility control.
   - Default uploads to internal-only.
3. [x] Build photo tracking.
   - Create `photos` table and storage integration.
   - Support caption, area, upload date, and visibility.
   - Allow linking photos to milestones.
4. [x] Build the unified activity timeline.
   - Show milestone changes, document uploads, photo uploads, and client-visible updates.
   - Filter client activity to published items only.
5. [x] Build the project detail workspace.
   - Add `Overview`, `Milestones`, `Documents`, `Photos`, and `Activity` sections.
   - PM gets edit controls; client gets filtered read-only access.
6. [x] Add search and filtering.
   - Filter by category, date, milestone, and visibility.
   - Search document titles and photo captions within a project.

Completed validation:

- [x] Applied `0003_phase2_core_operations.sql` to the live Supabase project
- [x] Verified milestone creation and visibility
- [x] Verified document visibility splits internal vs client-visible
- [x] Verified photo visibility splits internal vs client-visible
- [x] Verified activity timeline filters to client-visible items for clients
- [x] Verified PM can see complete project asset state

Definition of done:

- PM can manage milestones, documents, and progress photos from a real project workspace.
- Client can only see published files, photos, and progress data.
- Overall progress updates automatically from milestone state.

### Phase 3 - Client Collaboration and Launch Hardening

Status: `Complete`

Goal: finish the client workflow and prepare the MVP for real usage.

Tasks in build order:

1. [x] Build messaging.
   - Add project-scoped PM/client conversation threads.
   - Use Supabase realtime for new messages.
   - Track sent and read state.
2. [x] Build client update publishing.
   - Allow PM to publish structured project updates.
   - Show published updates in the client portal and activity feed.
   - Keep internal notes separate.
3. [x] Add notifications.
   - In-app notifications for messages and published updates.
   - Basic email notifications for unread messages and new client-visible updates.
4. [x] Harden onboarding and empty states.
   - PM onboarding: create org, create first project, invite first client.
   - Client onboarding: accept invite and access assigned project.
5. [x] Add operational guardrails.
   - Audit critical actions.
   - Add upload validation, permission checks, and error states.
6. [x] QA and release prep.
   - Seed a realistic demo workspace.
   - Validate desktop and mobile behavior.
   - Prepare Vercel + Supabase deployment settings.

Completed validation:

- [x] Applied `0004_phase3_collaboration.sql` to the live Supabase project
- [x] Verified PM can send project messages under RLS
- [x] Verified client can read PM messages and reply under RLS
- [x] Verified PM can publish internal and client-visible updates
- [x] Verified client only sees client-visible updates
- [x] Verified outsiders cannot read project messages
- [x] Applied `0005_phase3_completion.sql` to the live Supabase project
- [x] Verified invite-triggered client membership creation
- [x] Verified invite status flips to `accepted`
- [x] Verified project message read receipts
- [x] Verified demo seeding with `npm run seed:demo`
- [x] Verified local `npm run typecheck`
- [x] Verified local `npm run lint`
- [x] Verified local `npm run build`

Definition of done:

- PM and client can collaborate in near real time.
- PM can publish updates and the client receives them in the portal.
- PM can invite new clients with a direct onboarding link.
- The MVP is stable enough for demo use and initial release testing.

## How to update this roadmap

When a phase is completed:

- Change `Current phase` to the next phase
- Mark the completed phase as done
- Add a short note describing what was completed
- Update the `What exists right now` section to reflect the real product state

## Run locally

- `npm install`
- `npm run dev`

Open `http://localhost:3000`.

## Current routes

- `/` marketing and product overview
- `/auth` sign in and sign up
- `/app` authenticated dashboard
- `/app/projects` project list and creation
- `/app/projects/[projectId]` protected project detail
- `/pm` and `/client` redirect into `/app`

## Environment

Create `.env.local` when you are ready to connect Supabase:

- `NEXT_PUBLIC_SUPABASE_URL=your-project-url`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`
- `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
- `APP_ORIGIN=http://localhost:3000`

Optional for outbound email notifications:

- `RESEND_API_KEY=your-resend-api-key`
- `NOTIFICATION_FROM_EMAIL=updates@yourdomain.com`

## Supabase setup

Run the SQL in:

- `supabase/migrations/0001_phase1_foundation.sql`
- `supabase/migrations/0002_phase1_policy_fix.sql`
- `supabase/migrations/0003_phase2_core_operations.sql`
- `supabase/migrations/0004_phase3_collaboration.sql`
- `supabase/migrations/0005_phase3_completion.sql`

These migrations create and fix:

- organizations, profiles, projects, project_members, and milestones
- documents, photos, and activity events
- project messages, project updates, and notifications
- project invites and invite auto-assignment
- role/status enums
- asset visibility, document category, and activity event enums
- profile bootstrap trigger on `auth.users`
- row-level security policies for PM/client access control
- follow-up policy fix for project membership and client project visibility
- Phase 2 storage bucket and asset visibility rules

## Demo seed

Run:

- `npm run seed:demo`

This creates:

- one PM account
- one client account
- one in-progress demo project
- three milestones
- one published update
- a starter PM/client message thread
