import { DashboardShell } from "@/components/dashboard-shell";
import { clientMoments, milestones, projectSummary } from "@/lib/mock-data";

export default function ClientPortalPage() {
  return (
    <DashboardShell
      role="Client portal"
      intro="Review progress, read updates, and stay aligned without chasing your PM."
    >
      <article className="panel panel--dark">
        <p className="eyebrow">Current project</p>
        <h2>{projectSummary.name}</h2>
        <p className="hero-text">
          {projectSummary.percentComplete}% complete. The next major milestone
          is {projectSummary.nextMilestone}.
        </p>
      </article>

      <article className="panel">
        <p className="eyebrow">Published updates</p>
        <h2>Latest from your project team</h2>
        <ul className="list">
          {clientMoments.map((moment) => (
            <li key={moment}>{moment}</li>
          ))}
        </ul>
      </article>

      <article className="panel">
        <p className="eyebrow">Milestone view</p>
        <h2>Track the project stage by stage</h2>
        <div className="milestone-list">
          {milestones.map((milestone) => (
            <div key={milestone.name} className="milestone-item">
              <div>
                <strong>{milestone.name}</strong>
                <span>{milestone.status}</span>
              </div>
              <strong>{milestone.percent}%</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="panel panel--warm">
        <p className="eyebrow">Client messaging</p>
        <h2>Questions stay attached to the job record</h2>
        <p className="hero-text">
          Keep decisions inside the project workspace instead of scattered text
          messages and email threads.
        </p>
      </article>
    </DashboardShell>
  );
}
