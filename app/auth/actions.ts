"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function encodeMessage(value: string) {
  return encodeURIComponent(value);
}

async function getOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");

  if (origin) {
    return origin;
  }

  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
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
  const role = getString(formData, "role");
  const organizationName = getString(formData, "organizationName");
  const organizationSlug = getString(formData, "organizationSlug")
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (!["pm", "client"].includes(role)) {
    redirect("/auth?error=Select%20a%20valid%20role.");
  }

  if (role === "pm" && !organizationName) {
    redirect("/auth?error=Project%20managers%20must%20provide%20an%20organization%20name.");
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();
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
