import Link from "next/link";
import type { Route } from "next";
import { getProjectsForProfile } from "@/lib/data";
import { requireUserContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppDashboard({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireUserContext();
  const projects = await getProjectsForProfile(profile);
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
          <p className="hero-text">
            {profile.role === "pm"
              ? "Create your first project in the Projects view."
              : "No projects have been assigned to your account yet."}
          </p>
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
