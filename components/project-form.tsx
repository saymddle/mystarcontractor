"use client";

import { useActionState } from "react";
import { Field } from "@/components/field";
import { FormAlert } from "@/components/form-alert";
import { idleFormState, type FormState } from "@/lib/form-state";

export function ProjectForm({
  createProjectAction
}: {
  createProjectAction: (
    previous: FormState,
    formData: FormData
  ) => Promise<FormState>;
}) {
  const [state, submit, pending] = useActionState(
    createProjectAction,
    idleFormState
  );
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <article className="panel">
      <div className="panel__heading">
        <h2>Start a new job</h2>
        <p>Assign a client now, or leave it blank and assign one later.</p>
      </div>
      <form action={submit} className="form-grid" noValidate>
        <div className="field--full">
          <FormAlert state={state} />
        </div>

        <Field name="name" label="Project name" error={errors.name}>
          {(aria) => (
            <input {...aria} type="text" name="name" defaultValue={values.name ?? ""} />
          )}
        </Field>

        <Field name="location" label="Location" error={errors.location}>
          {(aria) => (
            <input
              {...aria}
              type="text"
              name="location"
              autoComplete="address-level2"
              defaultValue={values.location ?? ""}
            />
          )}
        </Field>

        <Field name="status" label="Status" error={errors.status}>
          {(aria) => (
            <select {...aria} name="status" defaultValue={values.status || "not_started"}>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </select>
          )}
        </Field>

        <Field name="startDate" label="Start date" error={errors.startDate}>
          {(aria) => (
            <input
              {...aria}
              type="date"
              name="startDate"
              defaultValue={values.startDate ?? ""}
            />
          )}
        </Field>

        <Field
          name="targetEndDate"
          label="Target end date"
          error={errors.targetEndDate}
        >
          {(aria) => (
            <input
              {...aria}
              type="date"
              name="targetEndDate"
              defaultValue={values.targetEndDate ?? ""}
            />
          )}
        </Field>

        <Field
          name="clientEmail"
          label="Client email"
          error={errors.clientEmail}
          hint="If no account uses this address, an invite is sent instead."
        >
          {(aria) => (
            <input
              {...aria}
              type="email"
              name="clientEmail"
              autoComplete="off"
              defaultValue={values.clientEmail ?? ""}
            />
          )}
        </Field>

        <button type="submit" className="button button--solid" disabled={pending}>
          {pending ? "Creating..." : "Create project"}
        </button>
      </form>
    </article>
  );
}
