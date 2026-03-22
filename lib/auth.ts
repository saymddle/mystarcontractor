import { redirect } from "next/navigation";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";
import type {
  OrganizationRecord,
  ProfileRecord,
  ProfileWithOrganization
} from "@/lib/types";

function normalizeOrganization(
  value: ProfileRecord["organizations"]
): OrganizationRecord | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getOptionalUserContext() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, organization_id, organizations(id, name, slug)")
    .eq("id", user.id)
    .single<ProfileRecord>();

  if (!profile) {
    return null;
  }

  return {
    user,
    profile: {
      ...profile,
      organization: normalizeOrganization(profile.organizations)
    } satisfies ProfileWithOrganization,
    supabase
  };
}

export async function requireUserContext() {
  const context = await getOptionalUserContext();

  if (!context) {
    redirect("/auth");
  }

  return context;
}
