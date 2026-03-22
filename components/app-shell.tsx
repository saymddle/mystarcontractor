import type { ReactNode } from "react";
import Link from "next/link";
import type { ProfileWithOrganization } from "@/lib/types";

export function AppShell({
  profile,
  signOutAction,
  children
}: {
  profile: ProfileWithOrganization;
  signOutAction: (formData: FormData) => Promise<void>;
  children: ReactNode;
}) {
  return (
    <main className="app-page">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand__mark">MSC</span>
          <span>My Star Contractor</span>
        </Link>

        <div className="sidebar__block">
          <p className="eyebrow">Workspace</p>
          <h2>{profile.organization?.name ?? "Organization"}</h2>
          <p className="hero-text">
            Signed in as {profile.full_name ?? "User"} ({profile.role}).
          </p>
        </div>

        <nav className="sidebar__nav" aria-label="App">
          <Link href="/app">Dashboard</Link>
          <Link href="/app/projects">Projects</Link>
        </nav>

        <form action={signOutAction}>
          <button type="submit" className="button button--ghost sidebar__button">
            Sign out
          </button>
        </form>
      </aside>
      <section className="app-content">{children}</section>
    </main>
  );
}
