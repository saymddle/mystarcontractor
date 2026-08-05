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
  return (
    <article className="panel">
      <div className="panel__heading">
        <h2>{projects.length === 0 ? "No projects yet" : "All projects"}</h2>
      </div>
      {projects.length === 0 ? (
        <div className="empty-state">
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <div className="project-list">
          {projects.map((project) => (
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
              <div className="project-card__meta">
                <span>Start {formatDate(project.start_date)}</span>
                <span>Target {formatDate(project.target_end_date)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
