import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { getOptionalUserContext } from "@/lib/auth";
import {
  activityFeed,
  clientMoments,
  documentGroups,
  milestones,
  projectSummary
} from "@/lib/mock-data";

const platformPillars = [
  "Project-based document control with client-safe publishing",
  "Progress photos and milestone tracking in one shared timeline",
  "Role-aware communication between project managers and clients"
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const context = await getOptionalUserContext();

  if (context) {
    redirect("/app");
  }

  return (
    <main className="landing-page">
      <BrandHeader />

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Construction management platform</p>
          <h1>One workspace for jobs, updates, documents, and client trust.</h1>
          <p className="hero-text">
            My Star Contractor brings project managers and clients into the same
            operating system without exposing the internal noise that slows a
            build down.
          </p>
          <div className="hero-actions">
            <Link href="/auth" className="button button--solid">
              Sign in or create account
            </Link>
            <Link href="/app" className="button button--ghost">
              Open app workspace
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card__header">
            <span>Active project snapshot</span>
            <strong>{projectSummary.status}</strong>
          </div>
          <h2>{projectSummary.name}</h2>
          <div className="progress-row">
            <span>Overall completion</span>
            <strong>{projectSummary.percentComplete}%</strong>
          </div>
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${projectSummary.percentComplete}%` }} />
          </div>
          <dl className="snapshot-list">
            <div>
              <dt>Next milestone</dt>
              <dd>{projectSummary.nextMilestone}</dd>
            </div>
            <div>
              <dt>Last update</dt>
              <dd>{projectSummary.updatedAt}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="insight-strip" id="platform">
        {platformPillars.map((pillar) => (
          <article key={pillar} className="insight-card">
            <p>{pillar}</p>
          </article>
        ))}
      </section>

      <section className="content-grid" id="workflow">
        <article className="panel">
          <div className="panel__heading">
            <p className="eyebrow">Milestone tracking</p>
            <h2>Run projects from structured stages, not scattered check-ins.</h2>
          </div>
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
          <div className="panel__heading">
            <p className="eyebrow">Document management</p>
            <h2>Organize every permit set, contract, and change order by job.</h2>
          </div>
          <div className="document-grid">
            {documentGroups.map((group) => (
              <div key={group.label} className="document-card">
                <strong>{group.label}</strong>
                <span>{group.count} files</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="role-grid" id="roles">
        <article className="panel panel--warm">
          <p className="eyebrow">For project managers</p>
          <h2>Control the flow of information without losing speed.</h2>
          <ul className="list">
            {activityFeed.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel panel--dark">
          <p className="eyebrow">For clients</p>
          <h2>A clean portal that shows what matters now.</h2>
          <ul className="list">
            {clientMoments.map((moment) => (
              <li key={moment}>{moment}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
