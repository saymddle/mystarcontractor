import { ProjectForm } from "@/components/project-form";
import { ProjectList } from "@/components/project-list";
import { requireUserContext } from "@/lib/auth";
import { getProjectsForProfile } from "@/lib/data";
import { createProjectAction } from "@/app/app/actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { profile } = await requireUserContext();
  const projects = await getProjectsForProfile(profile);
  const params = await searchParams;

  return (
    <section className="dashboard-stack">
      {params.error || params.message ? (
        <article
          className={`panel ${params.error ? "panel--error" : ""}`}
          role="alert"
          aria-live="polite"
        >
          <p className="eyebrow">{params.error ? "Action failed" : "Status"}</p>
          <p className="message-copy">{params.error ?? params.message}</p>
        </article>
      ) : null}

      <article className="panel">
        <h1>
          {profile.role === "pm"
            ? "Create, assign, and control project access."
            : "The projects currently assigned to you."}
        </h1>
      </article>

      {profile.role === "pm" ? (
        <ProjectForm createProjectAction={createProjectAction} />
      ) : null}

      <ProjectList
        projects={projects}
        emptyCopy={
          profile.role === "pm"
            ? "No projects exist yet for this organization."
            : "Your project manager has not assigned you to a project yet."
        }
      />
    </section>
  );
}
