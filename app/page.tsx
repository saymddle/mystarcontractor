import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { getOptionalUserContext } from "@/lib/auth";
import { documentGroups, milestones, platformPillars } from "@/lib/mock-data";

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
          <h1>Run every job from one shared workspace.</h1>
          <p className="hero-text">
            Project managers and clients see the same schedule, documents, and
            photos. Internal noise stays internal.
          </p>
          <div className="hero-actions">
            <Link href="/auth" className="button button--solid">
              Create your account
            </Link>
            <Link href="#workflow" className="button button--ghost">
              See how it works
            </Link>
          </div>
        </div>

        {/* TODO: hero photograph, 1600x1200 (4:3). A real job site, wide shot.
            Replace this slot with:
            <Image src="/hero.jpg" alt="..." width={1600} height={1200} priority
                   sizes="(max-width: 920px) 100vw, 45vw" /> */}
        <div className="hero-figure figure--slot">
          <span>Hero photograph, 4:3. Wide shot of an active job site.</span>
        </div>
      </section>

      <section className="section" id="platform">
        <div className="insight-strip insight-strip--media">
          <div>
            <h2 className="section-title">
              Built around how a job actually runs.
            </h2>
            <ul className="pillar-list">
              {platformPillars.map((pillar) => (
                <li key={pillar.title}>
                  <strong>{pillar.title}</strong>
                  <span>{pillar.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* TODO: supporting photograph, 900x1200 (3:4). Project manager on
              site with drawings or a tablet. */}
          <div className="figure figure--slot">
            <span>Supporting photograph, portrait. Project manager on site.</span>
          </div>
        </div>
      </section>

      <section className="section" id="workflow">
        <h2 className="section-title">
          Stages and files, not scattered check-ins.
        </h2>
        <div className="content-grid">
          <article className="panel">
            <div className="panel__heading">
              <h2>Milestone tracking</h2>
              <p>
                Overall completion is derived from milestone progress, so the
                number is never hand-maintained.
              </p>
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
              <h2>Document management</h2>
              <p>
                Every permit set, contract, and change order is filed against
                the job it belongs to.
              </p>
            </div>
            <div className="document-grid">
              {documentGroups.map((group) => (
                <div key={group.label} className="document-card">
                  <strong>{group.label}</strong>
                  <span className="num">{group.count}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section" id="roles">
        <h2 className="section-title">Two views of the same job.</h2>
        <div className="insight-strip">
          <article className="panel">
            <div className="panel__heading">
              <h2>For project managers</h2>
              <p>
                Full edit control over milestones, uploads, and what gets
                published to the client.
              </p>
            </div>
            <ul className="list">
              <li>
                <div>
                  <strong>Upload once, decide who sees it</strong>
                  <span>
                    Documents and photos default to internal until you publish
                    them.
                  </span>
                </div>
              </li>
              <li>
                <div>
                  <strong>Track the build stage by stage</strong>
                  <span>
                    Milestone status and percent complete roll up automatically.
                  </span>
                </div>
              </li>
              <li>
                <div>
                  <strong>Invite clients directly</strong>
                  <span>
                    Send an invite link that assigns project access on signup.
                  </span>
                </div>
              </li>
            </ul>
          </article>

          <article className="panel panel--accent">
            <div className="panel__heading">
              <h2>For clients</h2>
              <p>A filtered, read-only portal with no internal clutter.</p>
            </div>
            <ul className="list">
              <li>
                <div>
                  <strong>Published progress photos</strong>
                  <span>From the latest site walk.</span>
                </div>
              </li>
              <li>
                <div>
                  <strong>Approved documents</strong>
                  <span>Permit sets and contracts as they are released.</span>
                </div>
              </li>
              <li>
                <div>
                  <strong>A direct message thread</strong>
                  <span>One place to ask, scoped to the project.</span>
                </div>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
