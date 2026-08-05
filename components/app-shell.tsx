import type { ReactNode } from "react";
import Link from "next/link";
import type { NotificationRecord, ProfileWithOrganization } from "@/lib/types";
import { markNotificationsReadAction } from "@/app/app/actions";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export function AppShell({
  profile,
  notifications,
  signOutAction,
  children
}: {
  profile: ProfileWithOrganization;
  notifications: NotificationRecord[];
  signOutAction: (formData: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <main className="app-page">
      <RealtimeRefresh
        channels={[
          {
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${profile.id}`
          }
        ]}
      />
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand__mark">MSC</span>
          <span>My Star Contractor</span>
        </Link>

        <div className="sidebar__block">
          <h2>{profile.organization?.name ?? "Organization"}</h2>
          <p className="sidebar__copy">
            {profile.full_name ?? "User"} ·{" "}
            {profile.role === "pm" ? "Project manager" : "Client"}
          </p>
        </div>

        <nav className="sidebar__nav" aria-label="App">
          <Link href="/app">Dashboard</Link>
          <Link href="/app/projects">Projects</Link>
        </nav>

        <div className="sidebar__block">
          <div className="sidebar__heading">
            <strong>Notifications</strong>
            <span className="status-pill">{unreadCount} unread</span>
          </div>
          {notifications.length === 0 ? (
            <p className="sidebar__copy">No notifications yet.</p>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.link_path ?? "/app"}
                  className={`notification-card ${notification.read_at ? "" : "notification-card--unread"}`}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.detail || notification.kind}</span>
                </Link>
              ))}
            </div>
          )}
          {unreadCount > 0 ? (
            <form action={markNotificationsReadAction}>
              <button type="submit" className="button button--ghost sidebar__button">
                Mark all read
              </button>
            </form>
          ) : null}
        </div>

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
