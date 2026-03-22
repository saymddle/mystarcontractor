import Link from "next/link";
import type { Route } from "next";
import { getOnboardingSummary, getProjectsForProfile } from "@/lib/data";
import { requireUserContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppDashboard({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireUserContext();
  const projects = await getProjectsForProfile(profile);
  const onboarding = await getOnboardingSummary(profile);
  const params = await searchParams;
  const recentProjects = projects.slice(0, 3);

  return (
    <section className="dashboard-stack">
      <article className="panel">
        <p className="eyebrow">Dashboard</p>
        <h1>
          {profile.role === "pm"
            ? "Manage access, projects, and client assignments."
            : "Track the projects that have been assigned to you."}
        </h1>
        <p className="hero-text">
          {profile.role === "pm"
            ? "Phase 1 is now wired for real accounts, protected routes, and project ownership."
            : "Your portal is now backed by authenticated project membership instead of a demo page."}
        </p>
      </article>

      <section className="stats-row">
        <article className="stat-card">
          <span>Total projects</span>
          <strong>{projects.length}</strong>
        </article>
        <article className="stat-card">
          <span>Role</span>
          <strong>{profile.role === "pm" ? "Project manager" : "Client"}</strong>
        </article>
        <article className="stat-card">
          <span>Organization</span>
          <strong>{profile.organization?.slug ?? "Not set"}</strong>
        </article>
      </section>

      {profile.role === "pm" ? (
        <article className="panel">
          <div className="panel__heading">
            <p className="eyebrow">Onboarding</p>
            <h2>Launch checklist</h2>
          </div>
          <ul className="list">
            <li>
              <strong>Create your first project</strong>
              <span>{onboarding.projectCount > 0 ? "Complete" : "Pending"}</span>
            </li>
            <li>
              <strong>Add or invite a client</strong>
              <span>
                {onboarding.clientCount > 0 || onboarding.pendingInviteCount > 0
                  ? "In progress"
                  : "Pending"}
              </span>
            </li>
            <li>
              <strong>Publish an update and send a message</strong>
              <span>{onboarding.projectCount > 0 ? "Ready" : "Blocked"}</span>
            </li>
          </ul>
        </article>
      ) : null}

      {params.error ? (
        <article className="panel panel--error">
          <p className="eyebrow">Action failed</p>
          <p className="message-copy">{params.error}</p>
        </article>
      ) : null}

      <article className="panel">
        <div className="panel__heading">
          <p className="eyebrow">Recent projects</p>
          <h2>{profile.role === "pm" ? "Your organization" : "Your assignments"}</h2>
        </div>
        {recentProjects.length === 0 ? (
          <div className="empty-state">
            <p className="hero-text">
              {profile.role === "pm"
                ? "Create your first project in the Projects view and start publishing structured updates from there."
                : "No projects have been assigned to your account yet. Once your PM assigns one, messages and published updates will show up here."}
            </p>
          </div>
        ) : (
          <div className="project-list">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}` as Route}
                className="project-card"
              >
                <div className="project-card__header">
                  <strong>{project.name}</strong>
                  <span className="status-pill">
                    {project.status.replace("_", " ")}
                  </span>
                </div>
                <p>{project.location || "Location not set"}</p>
              </Link>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
