"use server";

import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toQueryError(message: string) {
  return encodeURIComponent(message);
}

async function requirePmProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, organization_id")
    .eq("id", user.id)
    .single<{ id: string; role: string; organization_id: string }>();

  if (!profile || profile.role !== "pm") {
    redirect("/app?error=Only%20project%20managers%20can%20perform%20that%20action.");
  }

  return { supabase, user, profile };
}

export async function createProjectAction(formData: FormData) {
  const { supabase, user, profile } = await requirePmProfile();

  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const status = getString(formData, "status");
  const startDate = getString(formData, "startDate");
  const targetEndDate = getString(formData, "targetEndDate");
  const clientEmail = getString(formData, "clientEmail").toLowerCase();

  if (!name) {
    redirect("/app/projects?error=Project%20name%20is%20required.");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      organization_id: profile.organization_id,
      name,
      location: location || null,
      status,
      start_date: startDate || null,
      target_end_date: targetEndDate || null,
      created_by: user.id
    })
    .select("id")
    .single<{ id: string }>();

  if (projectError || !project) {
    redirect(
      `/app/projects?error=${toQueryError(
        projectError?.message ?? "Unable to create project."
      )}`
    );
  }

  await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "pm"
  });

  if (clientEmail) {
    const { data: invitedUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "client")
      .eq("organization_id", profile.organization_id)
      .eq("email", clientEmail)
      .maybeSingle<{ id: string }>();

    if (invitedUser) {
      await supabase.from("project_members").insert({
        project_id: project.id,
        user_id: invitedUser.id,
        role: "client"
      });
    }
  }

  redirect(`/app/projects/${project.id}`);
}

export async function assignClientAction(formData: FormData) {
  const { supabase, profile } = await requirePmProfile();
  const projectId = getString(formData, "projectId");
  const clientEmail = getString(formData, "clientEmail").toLowerCase();

  if (!projectId || !clientEmail) {
    redirect(`/app/projects/${projectId}?error=Client%20email%20is%20required.`);
  }

  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("role", "client")
    .eq("email", clientEmail)
    .maybeSingle<{ id: string }>();

  if (!clientProfile) {
    redirect(
      `/app/projects/${projectId}?error=Client%20account%20not%20found%20in%20this%20organization.`
    );
  }

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: clientProfile.id,
    role: "client"
  });

  if (error) {
    redirect(
      `/app/projects/${projectId}?error=${toQueryError(error.message)}`
    );
  }

  redirect(`/app/projects/${projectId}?message=Client%20assigned%20successfully.`);
}

export { signOutAction };
