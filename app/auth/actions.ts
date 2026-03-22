"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getAppOrigin } from "@/lib/app-url";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function encodeMessage(value: string) {
  return encodeURIComponent(value);
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/auth?error=${encodeMessage(error.message)}`);
  }

  redirect("/app");
}

export async function signUpAction(formData: FormData) {
  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const inviteToken = getString(formData, "inviteToken");
  let role = getString(formData, "role");
  const organizationName = getString(formData, "organizationName");
  let organizationSlug = getString(formData, "organizationSlug")
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (inviteToken) {
    const admin = createSupabaseAdminClient();
    const { data: invite } = await admin
      .from("project_invites")
      .select("email, status, expires_at, organization_id, projects(organizations(slug))")
      .eq("token", inviteToken)
      .maybeSingle<{
        email: string;
        status: string;
        expires_at: string | null;
        organization_id: string;
        projects:
          | {
              organizations:
                | {
                    slug: string;
                  }
                | {
                    slug: string;
                  }[];
            }
          | null;
      }>();

    const organization = invite?.projects
      ? Array.isArray(invite.projects.organizations)
        ? invite.projects.organizations[0]
        : invite.projects.organizations
      : null;

    const isExpired = invite?.expires_at
      ? new Date(invite.expires_at).getTime() <= Date.now()
      : false;

    if (!invite || invite.status !== "pending" || isExpired || !organization) {
      redirect("/auth?error=This%20invite%20is%20no%20longer%20valid.");
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      redirect("/auth?error=Use%20the%20same%20email%20address%20that%20received%20the%20invite.");
    }

    role = "client";
    organizationSlug = organization.slug;
  }

  if (!["pm", "client"].includes(role)) {
    redirect("/auth?error=Select%20a%20valid%20role.");
  }

  if (role === "pm" && !organizationName) {
    redirect("/auth?error=Project%20managers%20must%20provide%20an%20organization%20name.");
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getAppOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        role,
        organization_name: organizationName,
        organization_slug: organizationSlug
      }
    }
  });

  if (error) {
    redirect(`/auth?error=${encodeMessage(error.message)}`);
  }

  if (!data.session) {
    redirect(
      "/auth?message=Account%20created.%20Check%20your%20email%20to%20confirm%20sign-in."
    );
  }

  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
