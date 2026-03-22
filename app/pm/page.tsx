import { DashboardShell } from "@/components/dashboard-shell";
import {
  activityFeed,
  documentGroups,
  milestones,
  projectSummary
} from "@/lib/mock-data";

export default function ProjectManagerPage() {
  return (
    <DashboardShell
      role="Project manager workspace"
      intro="Manage visibility, updates, and field documentation from one command view."
    >
      <article className="panel">
        <p className="eyebrow">Project status</p>
        <h2>{projectSummary.name}</h2>
        <div className="stats-row">
          <div className="stat-card">
            <span>Progress</span>
            <strong>{projectSummary.percentComplete}%</strong>
          </div>
          <div className="stat-card">
            <span>Status</span>
            <strong>{projectSummary.status}</strong>
          </div>
          <div className="stat-card">
            <span>Next milestone</span>
            <strong>{projectSummary.nextMilestone}</strong>
          </div>
        </div>
      </article>

      <article className="panel">
        <p className="eyebrow">Recent activity</p>
        <h2>Field and client timeline</h2>
        <ul className="list">
          {activityFeed.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
              <small>{item.meta}</small>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel">
        <p className="eyebrow">Milestones</p>
        <h2>Structured progress tracking</h2>
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

      <article className="panel">
        <p className="eyebrow">File library</p>
        <h2>Client-safe publishing controls</h2>
        <div className="document-grid">
          {documentGroups.map((group) => (
            <div key={group.label} className="document-card">
              <strong>{group.label}</strong>
              <span>{group.count} files</span>
            </div>
          ))}
        </div>
      </article>
    </DashboardShell>
  );
}
