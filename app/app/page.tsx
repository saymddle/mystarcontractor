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
  const isPm = profile.role === "pm";

  return (
    <section className="dashboard-stack">
      {params.error ? (
        <article className="panel panel--error" role="alert" aria-live="polite">
          <p className="eyebrow">Action failed</p>
          <p className="message-copy">{params.error}</p>
        </article>
      ) : null}

      <article className="panel">
        <h1>
          {isPm
            ? "Manage access, projects, and client assignments."
            : "Track the projects assigned to you."}
        </h1>
        <p className="hero-text">
          {isPm
            ? "Create projects, assign clients, and control what gets published to the client portal."
            : "Documents, photos, and updates appear here once your project manager publishes them."}
        </p>
      </article>

      <section className="stats-row">
        <article className="stat-card">
          <span>Total projects</span>
          <strong>{projects.length}</strong>
        </article>
        <article className="stat-card">
          <span>Role</span>
          <strong>{isPm ? "Project manager" : "Client"}</strong>
        </article>
        <article className="stat-card">
          <span>Organization</span>
          <strong>{profile.organization?.slug ?? "Not set"}</strong>
        </article>
      </section>

      {isPm ? (
        <article className="panel">
          <div className="panel__heading">
            <h2>Launch checklist</h2>
          </div>
          <ul className="list">
            <li>
              <div>
                <strong>Create your first project</strong>
              </div>
              <span className="status-pill">
                {onboarding.projectCount > 0 ? "Complete" : "Pending"}
              </span>
            </li>
            <li>
              <div>
                <strong>Add or invite a client</strong>
              </div>
              <span className="status-pill">
                {onboarding.clientCount > 0 || onboarding.pendingInviteCount > 0
                  ? "In progress"
                  : "Pending"}
              </span>
            </li>
            <li>
              <div>
                <strong>Publish an update and send a message</strong>
              </div>
              <span className="status-pill">
                {onboarding.projectCount > 0 ? "Ready" : "Blocked"}
              </span>
            </li>
          </ul>
        </article>
      ) : null}

      <article className="panel">
        <div className="panel__heading">
          <h2>{isPm ? "Recent projects" : "Your assignments"}</h2>
        </div>
        {recentProjects.length === 0 ? (
          <div className="empty-state">
            <p>
              {isPm
                ? "No projects yet. Create your first one in the Projects view to start tracking milestones and publishing updates."
                : "No projects have been assigned to your account yet. Once your project manager assigns one, it will appear here."}
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
