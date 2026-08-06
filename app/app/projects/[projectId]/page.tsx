import { notFound } from "next/navigation";
import { requireUserContext } from "@/lib/auth";
import {
  getProgressSummary,
  getProjectWorkspaceForProfile
} from "@/lib/data";
import {
  assignClientAction,
  createClientInviteAction,
  createMilestoneAction,
  markProjectMessagesReadAction,
  markNotificationsReadAction,
  publishUpdateAction,
  sendMessageAction,
  updateMilestoneAction,
  uploadDocumentAction,
  uploadPhotoAction
} from "@/app/app/actions";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import {
  AssignClientForm,
  CreateMilestoneForm,
  InviteClientForm,
  MilestoneEditor,
  PublishUpdateForm,
  SendMessageForm,
  UploadDocumentForm,
  UploadPhotoForm
} from "@/components/project-forms";
import type { AssetVisibility, DocumentCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const visibilityOptions: Array<AssetVisibility> = ["internal", "client_visible"];
const documentCategories: Array<DocumentCategory> = [
  "contracts",
  "permits",
  "plans",
  "invoices",
  "change_orders",
  "other"
];

const sections = [
  { id: "overview", label: "Overview" },
  { id: "milestones", label: "Milestones" },
  { id: "files", label: "Files" },
  { id: "activity", label: "Activity" },
  { id: "updates", label: "Updates" },
  { id: "messages", label: "Messages" },
  { id: "access", label: "Access" }
];

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

function formatBytes(value: number | null) {
  if (!value) {
    return "Unknown size";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    q?: string;
    visibility?: AssetVisibility | "all";
    category?: string;
  }>;
}) {
  const { profile } = await requireUserContext();
  const { projectId } = await params;
  const query = await searchParams;
  const data = await getProjectWorkspaceForProfile(projectId, profile, {
    query: query.q,
    visibility: query.visibility,
    documentCategory: query.category
  });

  if (!data) {
    notFound();
  }

  const progress = getProgressSummary(data.milestones);
  const isPm = profile.role === "pm";

  return (
    <div className="workspace">
      <RealtimeRefresh
        channels={[
          { schema: "public", table: "project_messages", filter: `project_id=eq.${data.project.id}` },
          { schema: "public", table: "project_updates", filter: `project_id=eq.${data.project.id}` },
          { schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` }
        ]}
      />

      <article className="panel">
        <h1>{data.project.name}</h1>
        <p className="hero-text">
          {data.project.location || "Location not set"} ·{" "}
          {data.project.status.replace("_", " ")}
        </p>
      </article>

      <nav className="section-rail" aria-label="Project sections">
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      {/* ---------------------------------------------------------------- */}
      <section className="workspace-section" id="overview">
        <h2 className="section-title">Overview</h2>

        <div className="stats-row">
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
          <article className="stat-card">
            <span>Documents</span>
            <strong>{data.documents.length}</strong>
          </article>
          <article className="stat-card">
            <span>Photos</span>
            <strong>{data.photos.length}</strong>
          </article>
          <article className="stat-card">
            <span>Activity events</span>
            <strong>{data.activity.length}</strong>
          </article>
        </div>

        <article className="panel">
          <div className="panel__heading">
            <h2>Progress summary</h2>
            <p>
              Average milestone completion is {progress}%. Start{" "}
              {formatDate(data.project.start_date)}, target end{" "}
              {formatDate(data.project.target_end_date)}.
            </p>
          </div>
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="meta-list">
            <div>
              <span>Status</span>
              <strong>{data.project.status.replace("_", " ")}</strong>
            </div>
            <div>
              <span>Location</span>
              <strong>{data.project.location || "Not set"}</strong>
            </div>
          </div>
        </article>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="workspace-section" id="milestones">
        <h2 className="section-title">Milestones</h2>

        {isPm ? (
          <article className="panel">
            <div className="panel__heading">
              <h2>Add a milestone</h2>
              <p>Overall project completion is derived from these stages.</p>
            </div>
            <CreateMilestoneForm
              action={createMilestoneAction}
              projectId={data.project.id}
            />
          </article>
        ) : null}

        <article className="panel">
          <div className="panel__heading">
            <h2>Build stages</h2>
          </div>
          {data.milestones.length === 0 ? (
            <div className="empty-state">
              <p>
                {isPm
                  ? "No milestones yet. Add the first stage above to start tracking progress."
                  : "Your project manager has not added any milestones yet."}
              </p>
            </div>
          ) : isPm ? (
            <div className="editor-list">
              {data.milestones.map((milestone) => (
                <MilestoneEditor
                  key={milestone.id}
                  action={updateMilestoneAction}
                  projectId={data.project.id}
                  milestone={milestone}
                />
              ))}
            </div>
          ) : (
            <div className="milestone-list">
              {data.milestones.map((milestone) => (
                <div key={milestone.id} className="milestone-item">
                  <div>
                    <strong>{milestone.title}</strong>
                    <span>{milestone.status.replace("_", " ")}</span>
                  </div>
                  <strong>{milestone.percent_complete}%</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="workspace-section" id="files">
        <h2 className="section-title">Files</h2>

        <article className="panel">
          <div className="panel__heading">
            <h2>Search and filter</h2>
            <p>Applies to documents, photos, and the activity timeline.</p>
          </div>
          <form className="toolbar" method="get">
            <label className="field">
              <span>Search</span>
              <input
                type="text"
                name="q"
                defaultValue={query.q ?? ""}
                placeholder="Title or caption"
              />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select name="visibility" defaultValue={query.visibility ?? "all"}>
                <option value="all">All visibility</option>
                {visibilityOptions.map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Document category</span>
              <select name="category" defaultValue={query.category ?? "all"}>
                <option value="all">All categories</option>
                {documentCategories.map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="button button--ghost">
              Apply
            </button>
          </form>
        </article>

        {isPm ? (
          <div className="content-grid">
            <article className="panel">
              <div className="panel__heading">
                <h2>Upload a document</h2>
                <p>Contracts, permits, plans, and change orders.</p>
              </div>
              <UploadDocumentForm
                action={uploadDocumentAction}
                projectId={data.project.id}
                milestones={data.milestones}
              />
            </article>

            <article className="panel">
              <div className="panel__heading">
                <h2>Upload a photo</h2>
                <p>Progress photos with area and visibility control.</p>
              </div>
              <UploadPhotoForm
                action={uploadPhotoAction}
                projectId={data.project.id}
                milestones={data.milestones}
              />
            </article>
          </div>
        ) : null}

        <div className="content-grid">
          <article className="panel">
            <div className="panel__heading">
              <h2>Documents</h2>
            </div>
            {data.documents.length === 0 ? (
              <div className="empty-state">
                <p>No documents match the current filters.</p>
              </div>
            ) : (
              <div className="asset-list">
                {data.documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.file_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="asset-card"
                  >
                    <div className="asset-card__header">
                      <strong>{document.title}</strong>
                      <span className="status-pill">
                        {document.visibility.replace("_", " ")}
                      </span>
                    </div>
                    <p>{document.category.replace("_", " ")}</p>
                    <div className="project-card__meta">
                      <span>{document.file_name}</span>
                      <span>{formatBytes(document.file_size)}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel__heading">
              <h2>Photos</h2>
            </div>
            {data.photos.length === 0 ? (
              <div className="empty-state">
                <p>No photos match the current filters.</p>
              </div>
            ) : (
              <div className="photo-grid">
                {data.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.file_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="photo-card"
                  >
                    {photo.file_url ? (
                      // Supabase storage URLs are not a fixed remote pattern,
                      // so next/image optimization is skipped here on purpose.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.file_url}
                        alt={photo.caption ?? photo.file_name}
                        width={480}
                        height={200}
                        loading="lazy"
                      />
                    ) : null}
                    <div className="photo-card__body">
                      <strong>{photo.caption || photo.file_name}</strong>
                      <span>{photo.area || "Area not set"}</span>
                      <span>{photo.visibility.replace("_", " ")}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="workspace-section" id="activity">
        <h2 className="section-title">Activity</h2>
        <article className="panel">
          <div className="panel__heading">
            <h2>Project timeline</h2>
          </div>
          {data.activity.length === 0 ? (
            <div className="empty-state">
              <p>No activity matches the current filters.</p>
            </div>
          ) : (
            <ul className="list">
              {data.activity.map((event) => (
                <li key={event.id}>
                  <div className="activity-copy">
                    <strong>{event.title}</strong>
                    <span>
                      {event.detail || event.event_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <small>{formatDate(event.created_at)}</small>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="workspace-section" id="updates">
        <h2 className="section-title">Updates</h2>

        {isPm ? (
          <article className="panel">
            <div className="panel__heading">
              <h2>Publish an update</h2>
              <p>
                Client-visible updates appear in the client portal and the
                activity feed. Internal notes stay with your team.
              </p>
            </div>
            <PublishUpdateForm
              action={publishUpdateAction}
              projectId={data.project.id}
              milestones={data.milestones}
            />
          </article>
        ) : null}

        <article className="panel">
          <div className="panel__heading">
            <h2>Published updates</h2>
          </div>
          {data.updates.length === 0 ? (
            <div className="empty-state">
              <p>No project updates have been published yet.</p>
            </div>
          ) : (
            <div className="editor-list">
              {data.updates.map((update) => (
                <article key={update.id} className="editor-card">
                  <div className="editor-card__header">
                    <strong>{update.title}</strong>
                    <span className="status-pill">
                      {update.visibility.replace("_", " ")}
                    </span>
                  </div>
                  <p className="message-copy">{update.body}</p>
                  <small>{formatDate(update.created_at)}</small>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="workspace-section" id="messages">
        <h2 className="section-title">Messages</h2>
        <article className="panel">
          <div className="panel__heading">
            <h2>Project conversation</h2>
          </div>
          {data.messages.length === 0 ? (
            <div className="empty-state">
              <p>No messages in this thread yet. Send the first one below.</p>
            </div>
          ) : (
            <div className="chat-thread">
              {data.messages.map((message) => (
                <article
                  key={message.id}
                  className={`chat-bubble ${message.sender_id === profile.id ? "chat-bubble--self" : ""}`}
                >
                  <div className="chat-bubble__meta">
                    <strong>{message.sender_name}</strong>
                    <span>{message.is_read ? "Read" : "Unread"}</span>
                  </div>
                  <p>{message.body}</p>
                  <small>{formatDate(message.created_at)}</small>
                </article>
              ))}
            </div>
          )}
          <SendMessageForm
            action={sendMessageAction}
            projectId={data.project.id}
          />
          <div className="panel__divider" />
          <div className="hero-actions">
            <form action={markProjectMessagesReadAction}>
              <input type="hidden" name="projectId" value={data.project.id} />
              <button type="submit" className="button button--ghost">
                Mark thread read
              </button>
            </form>
            <form action={markNotificationsReadAction}>
              <button type="submit" className="button button--ghost">
                Mark notifications read
              </button>
            </form>
          </div>
        </article>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="workspace-section" id="access">
        <h2 className="section-title">Access</h2>

        <article className="panel">
          <div className="panel__heading">
            <h2>Who can see this project</h2>
          </div>
          <ul className="list">
            {data.project.members.map((member) => (
              <li key={member.id}>
                <div>
                  <strong>{member.fullName}</strong>
                </div>
                <span className="status-pill">
                  {member.role === "pm" ? "Project manager" : "Client"}
                </span>
              </li>
            ))}
          </ul>
          {isPm && data.invites.length > 0 ? (
            <>
              <div className="panel__divider" />
              <h2>Pending invites</h2>
              <div className="invite-list">
                {data.invites.map((invite) => (
                  <div key={invite.id} className="invite-card">
                    <strong>{invite.email}</strong>
                    <span>
                      {invite.status} until {formatDate(invite.expires_at)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </article>

        {isPm ? (
          <div className="content-grid">
            <article className="panel">
              <div className="panel__heading">
                <h2>Assign an existing client</h2>
                <p>The account must already exist in your organization.</p>
              </div>
              <AssignClientForm
                action={assignClientAction}
                projectId={data.project.id}
              />
            </article>

            <article className="panel">
              <div className="panel__heading">
                <h2>Invite a new client</h2>
                <p>
                  Sends a link that assigns project access as soon as they sign
                  up.
                </p>
              </div>
              <InviteClientForm
                action={createClientInviteAction}
                projectId={data.project.id}
              />
            </article>
          </div>
        ) : null}
      </section>
    </div>
  );
}
