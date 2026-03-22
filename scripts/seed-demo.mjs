import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const suffix = crypto.randomBytes(3).toString("hex");
const password = `DemoSeed!${suffix}abc123`;
const pmEmail = `demo-pm-${suffix}@example.com`;
const clientEmail = `demo-client-${suffix}@example.com`;
const organizationName = `Demo Build Co ${suffix}`;
const organizationSlug = `demo-build-${suffix}`;

const { data: pmUser, error: pmError } = await admin.auth.admin.createUser({
  email: pmEmail,
  password,
  email_confirm: true,
  user_metadata: {
    role: "pm",
    full_name: "Demo Project Manager",
    organization_name: organizationName,
    organization_slug: organizationSlug
  }
});

if (pmError) {
  throw pmError;
}

const { data: clientUser, error: clientError } = await admin.auth.admin.createUser({
  email: clientEmail,
  password,
  email_confirm: true,
  user_metadata: {
    role: "client",
    full_name: "Demo Client",
    organization_slug: organizationSlug
  }
});

if (clientError) {
  throw clientError;
}

const { data: pmProfile, error: pmProfileError } = await admin
  .from("profiles")
  .select("organization_id")
  .eq("id", pmUser.user.id)
  .single();

if (pmProfileError) {
  throw pmProfileError;
}

const { data: project, error: projectError } = await admin
  .from("projects")
  .insert({
    organization_id: pmProfile.organization_id,
    name: "Demo Townhouse Renovation",
    location: "Queens, NY",
    status: "in_progress",
    created_by: pmUser.user.id
  })
  .select("id")
  .single();

if (projectError) {
  throw projectError;
}

const { error: membershipError } = await admin.from("project_members").insert([
  { project_id: project.id, user_id: pmUser.user.id, role: "pm" },
  { project_id: project.id, user_id: clientUser.user.id, role: "client" }
]);

if (membershipError) {
  throw membershipError;
}

const { data: milestones, error: milestoneError } = await admin
  .from("milestones")
  .insert([
    {
      project_id: project.id,
      title: "Permits and approvals",
      status: "complete",
      percent_complete: 100,
      position: 0
    },
    {
      project_id: project.id,
      title: "Framing and rough-in",
      status: "in_progress",
      percent_complete: 65,
      position: 1
    },
    {
      project_id: project.id,
      title: "Finish carpentry",
      status: "not_started",
      percent_complete: 0,
      position: 2
    }
  ])
  .select("id, title");

if (milestoneError) {
  throw milestoneError;
}

await admin.from("project_updates").insert({
  project_id: project.id,
  milestone_id: milestones[1]?.id ?? null,
  title: "Weekly field update",
  body: "Electrical rough-in is on track and insulation starts next week.",
  visibility: "client_visible",
  created_by: pmUser.user.id
});

await admin.from("project_messages").insert([
  {
    project_id: project.id,
    sender_id: pmUser.user.id,
    body: "The crew wrapped framing on the second floor today."
  },
  {
    project_id: project.id,
    sender_id: clientUser.user.id,
    body: "Received. Please share photos when insulation starts."
  }
]);

console.log(
  JSON.stringify(
    {
      organizationSlug,
      pmEmail,
      clientEmail,
      password,
      projectId: project.id
    },
    null,
    2
  )
);
