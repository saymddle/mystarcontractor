"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getAppOrigin } from "@/lib/app-url";
import type { FormState } from "@/lib/form-state";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Supabase returns one generic message for a wrong email and a wrong password
 * alike, on purpose, so an attacker cannot enumerate accounts. Keep that
 * ambiguity: attaching it to a single field would imply the other one is fine.
 */
function isCredentialFailure(message: string) {
  return /invalid login credentials/i.test(message);
}

export async function signInAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const values = { email };

  const fieldErrors: Record<string, string> = {};
  if (!email) {
    fieldErrors.email = "Enter your email address.";
  }
  if (!password) {
    fieldErrors.password = "Enter your password.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      status: "error",
      message: isCredentialFailure(error.message)
        ? "That email and password do not match an account."
        : error.message,
      values
    };
  }

  redirect("/app");
}

export async function signUpAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const inviteToken = getString(formData, "inviteToken");
  let role = getString(formData, "role");
  const organizationName = getString(formData, "organizationName");
  let organizationSlug = getString(formData, "organizationSlug")
    .toLowerCase()
    .replace(/\s+/g, "-");

  const values = { fullName, email, role, organizationName, organizationSlug };
  const fieldErrors: Record<string, string> = {};

  if (!fullName) {
    fieldErrors.fullName = "Enter your full name.";
  }
  if (!email) {
    fieldErrors.email = "Enter your email address.";
  }
  if (!password) {
    fieldErrors.password = "Choose a password.";
  } else if (password.length < 8) {
    fieldErrors.password = "Use at least 8 characters.";
  }

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
      // Nothing the user can fix in a field, so this stays page-level.
      return {
        status: "error",
        message: "This invite is no longer valid. Ask your project manager to send a new one.",
        values
      };
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      fieldErrors.email = `This invite is reserved for ${invite.email}.`;
    }

    role = "client";
    organizationSlug = organization.slug;
  } else {
    if (!["pm", "client"].includes(role)) {
      fieldErrors.role = "Select a role.";
    }
    if (role === "pm" && !organizationName) {
      fieldErrors.organizationName =
        "Project managers must name the organization they are creating.";
    }
    if (!organizationSlug) {
      fieldErrors.organizationSlug =
        role === "client"
          ? "Enter the organization slug your project manager gave you."
          : "Choose a short slug for your organization, such as kestrel-build.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
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
    // An existing account is a problem with the email field specifically.
    if (/already registered|already exists/i.test(error.message)) {
      return {
        status: "error",
        fieldErrors: { email: "An account already uses this email address." },
        values
      };
    }

    return { status: "error", message: error.message, values };
  }

  if (!data.session) {
    return {
      status: "success",
      message: "Account created. Check your email to confirm your address, then sign in."
    };
  }

  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
