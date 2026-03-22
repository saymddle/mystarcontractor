import { notFound } from "next/navigation";
import { requireUserContext } from "@/lib/auth";
import { getProgressSummary, getProjectByIdForProfile } from "@/lib/data";
import { assignClientAction } from "@/app/app/actions";

export const dynamic = "force-dynamic";

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

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { profile } = await requireUserContext();
  const { projectId } = await params;
  const data = await getProjectByIdForProfile(projectId, profile);
  const query = await searchParams;

  if (!data) {
    notFound();
  }

  const progress = getProgressSummary(data.milestones);

  return (
    <section className="dashboard-stack">
      <article className="panel">
        <p className="eyebrow">Project detail</p>
        <h1>{data.project.name}</h1>
        <p className="hero-text">
          {data.project.location || "Location not set"} •{" "}
          {data.project.status.replace("_", " ")}
        </p>
      </article>

      {query.error ? (
        <article className="panel panel--error">
          <p className="eyebrow">Action failed</p>
          <p className="message-copy">{query.error}</p>
        </article>
      ) : null}

      {query.message ? (
        <article className="panel">
          <p className="eyebrow">Status</p>
          <p className="message-copy">{query.message}</p>
        </article>
      ) : null}

      <section className="stats-row">
        <article className="stat-card">
          <span>Milestones</span>
          <strong>{data.milestones.length}</strong>
        </article>
        <article className="stat-card">
          <span>Average completion</span>
          <strong>{progress}%</strong>
        </article>
        <article className="stat-card">
          <span>Target end</span>
          <strong>{formatDate(data.project.target_end_date)}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel__heading">
            <p className="eyebrow">Project membership</p>
            <h2>Current access list</h2>
          </div>
          <ul className="list">
            {data.project.members.map((member) => (
              <li key={member.id}>
                <strong>{member.fullName}</strong>
                <span>{member.role}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel__heading">
            <p className="eyebrow">Milestone seed</p>
            <h2>Phase 1 visibility</h2>
          </div>
          {data.milestones.length === 0 ? (
            <p className="hero-text">
              Milestone management arrives in Phase 2. This preview confirms the
              project-scoped data model is already in place.
            </p>
          ) : (
            <div className="milestone-list">
              {data.milestones.map((milestone) => (
                <div key={milestone.id} className="milestone-item">
                  <div>
                    <strong>{milestone.title}</strong>
                    <span>{milestone.status}</span>
                  </div>
                  <strong>{milestone.percent_complete}%</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {profile.role === "pm" ? (
        <article className="panel">
          <p className="eyebrow">Assign client</p>
          <h2>Add another client account to this project</h2>
          <form action={assignClientAction} className="form-grid">
            <input type="hidden" name="projectId" value={data.project.id} />
            <label className="field">
              <span>Client email</span>
              <input type="email" name="clientEmail" required />
            </label>
            <button type="submit" className="button button--solid">
              Assign client
            </button>
          </form>
        </article>
      ) : null}
    </section>
  );
}
