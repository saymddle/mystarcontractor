import { AppShell } from "@/components/app-shell";
import { SetupPanel } from "@/components/setup-panel";
import { requireUserContext } from "@/lib/auth";
import { getNotificationsForProfile } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/supabase";
import { signOutAction } from "@/app/app/actions";

export const dynamic = "force-dynamic";

export default async function AuthenticatedAppLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  if (!hasSupabaseEnv()) {
    return (
      <main className="landing-page">
        <SetupPanel />
      </main>
    );
  }

  const { profile } = await requireUserContext();
  const notifications = await getNotificationsForProfile(profile.id);

  return (
    <AppShell
      profile={profile}
      notifications={notifications}
      signOutAction={signOutAction}
    >
      {children}
    </AppShell>
  );
}
