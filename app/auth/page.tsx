import { redirect } from "next/navigation";
import { AuthForms } from "@/components/auth-forms";
import { BrandHeader } from "@/components/brand-header";
import { SetupPanel } from "@/components/setup-panel";
import { getOptionalUserContext } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase";
import { signInAction, signUpAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <main className="landing-page">
        <BrandHeader />
        <SetupPanel />
      </main>
    );
  }

  const context = await getOptionalUserContext();

  if (context) {
    redirect("/app");
  }

  const params = await searchParams;

  return (
    <main className="landing-page">
      <BrandHeader />
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Phase 1 access</p>
          <h1>Sign in or create your organization workspace.</h1>
          <p className="hero-text">
            Project managers create the organization and first project. Clients
            sign up using the organization slug already assigned to them.
          </p>
        </div>
      </section>
      <AuthForms
        signInAction={signInAction}
        signUpAction={signUpAction}
        message={params.message}
        error={params.error}
      />
    </main>
  );
}
