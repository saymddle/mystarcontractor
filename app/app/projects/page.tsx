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
      <article className="panel">
        <p className="eyebrow">Projects</p>
        <h1>
          {profile.role === "pm"
            ? "Create, assign, and control project access."
            : "View the projects currently assigned to you."}
        </h1>
      </article>

      {params.error ? (
        <article className="panel panel--error">
          <p className="eyebrow">Action failed</p>
          <p className="message-copy">{params.error}</p>
        </article>
      ) : null}

      {params.message ? (
        <article className="panel">
          <p className="eyebrow">Status</p>
          <p className="message-copy">{params.message}</p>
        </article>
      ) : null}

      {profile.role === "pm" ? (
        <ProjectForm createProjectAction={createProjectAction} />
      ) : null}

      <ProjectList
        projects={projects}
        emptyCopy={
          profile.role === "pm"
            ? "No projects exist yet for this organization."
            : "Your PM has not assigned you to a project yet."
        }
      />
    </section>
  );
}
