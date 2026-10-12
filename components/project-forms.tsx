"use client";

import { useActionState } from "react";
import { Field } from "@/components/field";
import { FormAlert } from "@/components/form-alert";
import { idleFormState, type FormState } from "@/lib/form-state";
import type {
  AssetVisibility,
  DocumentCategory,
  MilestoneRecord
} from "@/lib/types";

export type ProjectAction = (
  previous: FormState,
  formData: FormData
) => Promise<FormState>;

const visibilityOptions: Array<AssetVisibility> = ["internal", "client_visible"];
const documentCategories: Array<DocumentCategory> = [
  "contracts",
  "permits",
  "plans",
  "invoices",
  "change_orders",
  "other"
];

const milestoneStatuses = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "complete", label: "Complete" }
];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function VisibilitySelect({
  aria,
  defaultValue
}: {
  aria: Record<string, unknown>;
  defaultValue: string;
}) {
  return (
    <select {...aria} name="visibility" defaultValue={defaultValue}>
      {visibilityOptions.map((value) => (
        <option key={value} value={value}>
          {label(value)}
        </option>
      ))}
    </select>
  );
}

function MilestoneSelect({
  aria,
  milestones,
  defaultValue
}: {
  aria: Record<string, unknown>;
  milestones: MilestoneRecord[];
  defaultValue: string;
}) {
  return (
    <select {...aria} name="milestoneId" defaultValue={defaultValue}>
      <option value="">No milestone</option>
      {milestones.map((milestone) => (
        <option key={milestone.id} value={milestone.id}>
          {milestone.title}
        </option>
      ))}
    </select>
  );
}

/* -------------------------------------------------------------------------- */

export function AssignClientForm({
  action,
  projectId
}: {
  action: ProjectAction;
  projectId: string;
}) {
  const [state, submit, pending] = useActionState(action, idleFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={submit} className="form-stack" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Field name="clientEmail" label="Client email" error={errors.clientEmail}>
        {(aria) => (
          <input
            {...aria}
            type="email"
            name="clientEmail"
            autoComplete="off"
            defaultValue={state.values?.clientEmail ?? ""}
          />
        )}
      </Field>
      <button type="submit" className="button button--solid" disabled={pending}>
        {pending ? "Assigning..." : "Assign client"}
      </button>
    </form>
  );
}

export function InviteClientForm({
  action,
  projectId
}: {
  action: ProjectAction;
  projectId: string;
}) {
  const [state, submit, pending] = useActionState(action, idleFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={submit} className="form-stack" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Field name="email" label="Email" error={errors.email}>
        {(aria) => (
          <input
            {...aria}
            type="email"
            name="email"
            autoComplete="off"
            defaultValue={state.values?.email ?? ""}
          />
        )}
      </Field>
      <button type="submit" className="button button--ghost" disabled={pending}>
        {pending ? "Sending..." : "Send invite"}
      </button>
    </form>
  );
}

export function CreateMilestoneForm({
  action,
  projectId
}: {
  action: ProjectAction;
  projectId: string;
}) {
  const [state, submit, pending] = useActionState(action, idleFormState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={submit} className="form-grid" noValidate>
      <div className="field--full">
        <FormAlert state={state} />
      </div>
      <input type="hidden" name="projectId" value={projectId} />
      <Field name="title" label="Title" error={errors.title}>
        {(aria) => (
          <input
            {...aria}
            type="text"
            name="title"
            defaultValue={values.title ?? ""}
          />
        )}
      </Field>
      <Field name="status" label="Status" error={errors.status}>
        {(aria) => (
          <select {...aria} name="status" defaultValue={values.status || "not_started"}>
            {milestoneStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field
        name="percentComplete"
        label="Percent complete"
        error={errors.percentComplete}
      >
        {(aria) => (
          <input
            {...aria}
            type="number"
            name="percentComplete"
            min="0"
            max="100"
            defaultValue="0"
          />
        )}
      </Field>
      <Field name="dueDate" label="Due date" error={errors.dueDate}>
        {(aria) => (
          <input
            {...aria}
            type="date"
            name="dueDate"
            defaultValue={values.dueDate ?? ""}
          />
        )}
      </Field>
      <div className="field--full">
        <Field name="notes" label="Notes" error={errors.notes}>
          {(aria) => (
            <textarea {...aria} name="notes" rows={3} defaultValue={values.notes ?? ""} />
          )}
        </Field>
      </div>
      <button type="submit" className="button button--solid" disabled={pending}>
        {pending ? "Creating..." : "Create milestone"}
      </button>
    </form>
  );
}

export function MilestoneEditor({
  action,
  projectId,
  milestone
}: {
  action: ProjectAction;
  projectId: string;
  milestone: MilestoneRecord;
}) {
  const [state, submit, pending] = useActionState(action, idleFormState);
  const errors = state.fieldErrors ?? {};
  // Field ids must stay unique across the several editors on this page.
  const scope = `m${milestone.id}`;

  return (
    <form action={submit} className="editor-card" noValidate>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="milestoneId" value={milestone.id} />
      <div className="editor-card__header">
        <strong>{milestone.title}</strong>
        <span className="status-pill">{label(milestone.status)}</span>
      </div>
      <FormAlert state={state} />
      <div className="form-grid compact-grid">
        <Field name={`${scope}-title`} label="Title" error={errors.title}>
          {(aria) => (
            <input {...aria} type="text" name="title" defaultValue={milestone.title} />
          )}
        </Field>
        <Field name={`${scope}-status`} label="Status" error={errors.status}>
          {(aria) => (
            <select {...aria} name="status" defaultValue={milestone.status}>
              {milestoneStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          name={`${scope}-percent`}
          label="Percent complete"
          error={errors.percentComplete}
        >
          {(aria) => (
            <input
              {...aria}
              type="number"
              name="percentComplete"
              min="0"
              max="100"
              defaultValue={milestone.percent_complete}
            />
          )}
        </Field>
        <Field name={`${scope}-due`} label="Due date" error={errors.dueDate}>
          {(aria) => (
            <input
              {...aria}
              type="date"
              name="dueDate"
              defaultValue={formatDateInput(milestone.due_date)}
            />
          )}
        </Field>
      </div>
      <Field name={`${scope}-notes`} label="Notes" error={errors.notes}>
        {(aria) => (
          <textarea {...aria} name="notes" rows={3} defaultValue={milestone.notes ?? ""} />
        )}
      </Field>
      <button type="submit" className="button button--ghost" disabled={pending}>
        {pending ? "Saving..." : "Update milestone"}
      </button>
    </form>
  );
}

export function UploadDocumentForm({
  action,
  projectId,
  milestones
}: {
  action: ProjectAction;
  projectId: string;
  milestones: MilestoneRecord[];
}) {
  const [state, submit, pending] = useActionState(action, idleFormState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={submit} className="form-grid" noValidate>
      <div className="field--full">
        <FormAlert state={state} />
      </div>
      <input type="hidden" name="projectId" value={projectId} />
      <Field name="docTitle" label="Title" error={errors.title}>
        {(aria) => (
          <input {...aria} type="text" name="title" defaultValue={values.title ?? ""} />
        )}
      </Field>
      <Field name="category" label="Category" error={errors.category}>
        {(aria) => (
          <select {...aria} name="category" defaultValue={values.category || "other"}>
            {documentCategories.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field
        name="docVisibility"
        label="Visibility"
        error={errors.visibility}
        hint="Internal stays hidden from the client."
      >
        {(aria) => (
          <VisibilitySelect aria={aria} defaultValue={values.visibility || "internal"} />
        )}
      </Field>
      <Field name="docMilestone" label="Attach to milestone" error={errors.milestoneId}>
        {(aria) => (
          <MilestoneSelect
            aria={aria}
            milestones={milestones}
            defaultValue={values.milestoneId ?? ""}
          />
        )}
      </Field>
      <div className="field--full">
        <Field name="file" label="File" error={errors.file}>
          {(aria) => <input {...aria} type="file" name="file" />}
        </Field>
      </div>
      <button type="submit" className="button button--solid" disabled={pending}>
        {pending ? "Uploading..." : "Upload document"}
      </button>
    </form>
  );
}

export function UploadPhotoForm({
  action,
  projectId,
  milestones
}: {
  action: ProjectAction;
  projectId: string;
  milestones: MilestoneRecord[];
}) {
  const [state, submit, pending] = useActionState(action, idleFormState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={submit} className="form-grid" noValidate>
      <div className="field--full">
        <FormAlert state={state} />
      </div>
      <input type="hidden" name="projectId" value={projectId} />
      <Field name="caption" label="Caption" error={errors.caption}>
        {(aria) => (
          <input {...aria} type="text" name="caption" defaultValue={values.caption ?? ""} />
        )}
      </Field>
      <Field name="area" label="Area" error={errors.area}>
        {(aria) => (
          <input
            {...aria}
            type="text"
            name="area"
            placeholder="Kitchen, exterior, level 2"
            defaultValue={values.area ?? ""}
          />
        )}
      </Field>
      <Field
        name="photoVisibility"
        label="Visibility"
        error={errors.visibility}
        hint="Internal stays hidden from the client."
      >
        {(aria) => (
          <VisibilitySelect aria={aria} defaultValue={values.visibility || "internal"} />
        )}
      </Field>
      <Field name="photoMilestone" label="Attach to milestone" error={errors.milestoneId}>
        {(aria) => (
          <MilestoneSelect
            aria={aria}
            milestones={milestones}
            defaultValue={values.milestoneId ?? ""}
          />
        )}
      </Field>
      <div className="field--full">
        <Field name="photoFile" label="Image" error={errors.file}>
          {(aria) => <input {...aria} type="file" name="file" accept="image/*" />}
        </Field>
      </div>
      <button type="submit" className="button button--solid" disabled={pending}>
        {pending ? "Uploading..." : "Upload photo"}
      </button>
    </form>
  );
}

export function PublishUpdateForm({
  action,
  projectId,
  milestones
}: {
  action: ProjectAction;
  projectId: string;
  milestones: MilestoneRecord[];
}) {
  const [state, submit, pending] = useActionState(action, idleFormState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={submit} className="form-grid" noValidate>
      <div className="field--full">
        <FormAlert state={state} />
      </div>
      <input type="hidden" name="projectId" value={projectId} />
      <Field name="updateTitle" label="Title" error={errors.title}>
        {(aria) => (
          <input {...aria} type="text" name="title" defaultValue={values.title ?? ""} />
        )}
      </Field>
      <Field name="updateVisibility" label="Visibility" error={errors.visibility}>
        {(aria) => (
          <VisibilitySelect
            aria={aria}
            defaultValue={values.visibility || "client_visible"}
          />
        )}
      </Field>
      <Field name="updateMilestone" label="Attach to milestone" error={errors.milestoneId}>
        {(aria) => (
          <MilestoneSelect
            aria={aria}
            milestones={milestones}
            defaultValue={values.milestoneId ?? ""}
          />
        )}
      </Field>
      <div className="field--full">
        <Field name="updateBody" label="Update body" error={errors.body}>
          {(aria) => (
            <textarea {...aria} name="body" rows={4} defaultValue={values.body ?? ""} />
          )}
        </Field>
      </div>
      <button type="submit" className="button button--solid" disabled={pending}>
        {pending ? "Publishing..." : "Publish update"}
      </button>
    </form>
  );
}

export function SendMessageForm({
  action,
  projectId
}: {
  action: ProjectAction;
  projectId: string;
}) {
  const [state, submit, pending] = useActionState(action, idleFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={submit} className="form-stack" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="projectId" value={projectId} />
      <Field name="body" label="New message" error={errors.body}>
        {(aria) => (
          <textarea
            {...aria}
            name="body"
            rows={4}
            defaultValue={state.status === "success" ? "" : (state.values?.body ?? "")}
          />
        )}
      </Field>
      <button type="submit" className="button button--solid" disabled={pending}>
        {pending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
