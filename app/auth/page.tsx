import { redirect } from "next/navigation";
import { AuthForms } from "@/components/auth-forms";
import { BrandHeader } from "@/components/brand-header";
import { SetupPanel } from "@/components/setup-panel";
import { getOptionalUserContext } from "@/lib/auth";
import { getInviteByToken } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/supabase";
import { signInAction, signUpAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string; invite?: string }>;
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
  const invite = params.invite ? await getInviteByToken(params.invite) : null;
  const inviteExpired =
    invite?.expires_at ? new Date(invite.expires_at).getTime() <= Date.now() : false;
  const inviteUsable = invite && invite.status === "pending" && !inviteExpired;

  return (
    <main className="landing-page">
      <BrandHeader />
      <section className="auth-intro">
        <h1>
          {inviteUsable
            ? `Join ${invite.organization_name}`
            : "Sign in or create your workspace."}
        </h1>
        <p className="hero-text">
          {inviteUsable
            ? `This invite is reserved for ${invite.email}. Create the client login with that email and you will be added to ${invite.project_name} automatically.`
            : "Project managers create the organization and first project. Clients sign up with an invite link or the organization slug they were given."}
        </p>
      </section>
      <AuthForms
        signInAction={signInAction}
        signUpAction={signUpAction}
        message={params.message}
        error={params.error}
        invite={
          invite
            ? {
                ...invite,
                usable: Boolean(inviteUsable)
              }
            : undefined
        }
      />
    </main>
  );
}
