"use client";

import { useActionState } from "react";
import { Field } from "@/components/field";
import { FormAlert } from "@/components/form-alert";
import { idleFormState, type FormState } from "@/lib/form-state";

type AuthAction = (
  previous: FormState,
  formData: FormData
) => Promise<FormState>;

export function AuthForms({
  signInAction,
  signUpAction,
  invite
}: {
  signInAction: AuthAction;
  signUpAction: AuthAction;
  invite?: {
    token: string;
    email: string;
    organization_slug: string;
    organization_name: string;
    project_name: string;
    status: string;
    usable: boolean;
  };
}) {
  const [signInState, submitSignIn, signInPending] = useActionState(
    signInAction,
    idleFormState
  );
  const [signUpState, submitSignUp, signUpPending] = useActionState(
    signUpAction,
    idleFormState
  );

  const signInErrors = signInState.fieldErrors ?? {};
  const signUpErrors = signUpState.fieldErrors ?? {};
  const signUpValues = signUpState.values ?? {};

  return (
    <section className="auth-grid">
      <article className="panel">
        <div className="panel__heading">
          <h2>Return to your workspace</h2>
        </div>
        <form action={submitSignIn} className="form-stack" noValidate>
          <FormAlert state={signInState} />
          <Field name="signin-email" label="Email" error={signInErrors.email}>
            {(aria) => (
              <input
                {...aria}
                type="email"
                name="email"
                autoComplete="email"
                defaultValue={signInState.values?.email ?? ""}
              />
            )}
          </Field>
          <Field name="signin-password" label="Password" error={signInErrors.password}>
            {(aria) => (
              <input
                {...aria}
                type="password"
                name="password"
                autoComplete="current-password"
              />
            )}
          </Field>
          <button
            type="submit"
            className="button button--solid"
            disabled={signInPending}
          >
            {signInPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </article>

      <article className="panel panel--accent">
        <div className="panel__heading">
          <h2>{invite?.usable ? "Accept client invite" : "Create an account"}</h2>
        </div>
        <form action={submitSignUp} className="form-stack" noValidate>
          <FormAlert state={signUpState} />

          {invite?.token ? (
            <input type="hidden" name="inviteToken" value={invite.token} />
          ) : null}

          <Field name="signup-fullName" label="Full name" error={signUpErrors.fullName}>
            {(aria) => (
              <input
                {...aria}
                type="text"
                name="fullName"
                autoComplete="name"
                defaultValue={signUpValues.fullName ?? ""}
              />
            )}
          </Field>

          <Field name="signup-email" label="Email" error={signUpErrors.email}>
            {(aria) => (
              <input
                {...aria}
                type="email"
                name="email"
                autoComplete="email"
                readOnly={invite?.usable}
                defaultValue={signUpValues.email ?? invite?.email ?? ""}
              />
            )}
          </Field>

          <Field
            name="signup-password"
            label="Password"
            error={signUpErrors.password}
            hint="At least 8 characters."
          >
            {(aria) => (
              <input
                {...aria}
                type="password"
                name="password"
                autoComplete="new-password"
              />
            )}
          </Field>

          {invite?.usable ? (
            <input type="hidden" name="role" value="client" />
          ) : (
            <Field name="signup-role" label="Role" error={signUpErrors.role}>
              {(aria) => (
                <select
                  {...aria}
                  name="role"
                  defaultValue={signUpValues.role || "pm"}
                >
                  <option value="pm">Project manager</option>
                  <option value="client">Client</option>
                </select>
              )}
            </Field>
          )}

          {invite?.usable ? (
            <div className="invite-banner">
              <strong>{invite.project_name}</strong>
              <span>
                Organization: <code>{invite.organization_slug}</code>
              </span>
            </div>
          ) : (
            <Field
              name="signup-organizationName"
              label="Organization name"
              error={signUpErrors.organizationName}
              hint="Required when signing up as a project manager. Leave blank if you are joining as a client."
            >
              {(aria) => (
                <input
                  {...aria}
                  type="text"
                  name="organizationName"
                  autoComplete="organization"
                  defaultValue={signUpValues.organizationName ?? ""}
                />
              )}
            </Field>
          )}

          <Field
            name="signup-organizationSlug"
            label="Organization slug"
            error={signUpErrors.organizationSlug}
            hint="Project managers choose a new slug. Clients enter the slug their project manager gave them."
          >
            {(aria) => (
              <input
                {...aria}
                type="text"
                name="organizationSlug"
                readOnly={invite?.usable}
                defaultValue={
                  signUpValues.organizationSlug ?? invite?.organization_slug ?? ""
                }
              />
            )}
          </Field>

          <button
            type="submit"
            className="button button--solid"
            disabled={signUpPending}
          >
            {signUpPending
              ? "Creating account..."
              : invite?.usable
                ? "Accept invite"
                : "Create account"}
          </button>
        </form>
      </article>
    </section>
  );
}
