import Link from "next/link";
import type { Route } from "next";
import type { ProjectRecord } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function ProjectList({
  projects,
  emptyCopy
}: {
  projects: ProjectRecord[];
  emptyCopy: string;
}) {
  if (projects.length === 0) {
    return (
      <article className="panel">
        <p className="eyebrow">Projects</p>
        <h2>No projects yet.</h2>
        <p className="hero-text">{emptyCopy}</p>
      </article>
    );
  }

  return (
    <article className="panel">
      <p className="eyebrow">Projects</p>
      <h2>Current project list</h2>
      <div className="project-list">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/app/projects/${project.id}` as Route}
            className="project-card"
          >
            <div className="project-card__header">
              <strong>{project.name}</strong>
              <span className="status-pill">{project.status.replace("_", " ")}</span>
            </div>
            <p>{project.location || "Location not set"}</p>
            <div className="project-card__meta">
              <span>Start {formatDate(project.start_date)}</span>
              <span>Target {formatDate(project.target_end_date)}</span>
            </div>
          </Link>
        ))}
      </div>
    </article>
  );
}
