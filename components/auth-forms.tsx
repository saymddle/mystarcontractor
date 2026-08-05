export function AuthForms({
  signInAction,
  signUpAction,
  message,
  error,
  invite
}: {
  signInAction: (formData: FormData) => Promise<void>;
  signUpAction: (formData: FormData) => Promise<void>;
  message?: string;
  error?: string;
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
  return (
    <>
      {/* Announced and placed above the forms, not appended after them. */}
      {error || message ? (
        <article
          className={`panel ${error ? "panel--error" : ""}`}
          role="alert"
          aria-live="polite"
        >
          <p className="eyebrow">{error ? "Action failed" : "Status"}</p>
          <p className="message-copy">{error ?? message}</p>
        </article>
      ) : null}

      <section className="auth-grid">
        <article className="panel">
          <div className="panel__heading">
            <h2>Return to your workspace</h2>
          </div>
          <form action={signInAction} className="form-stack">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                minLength={8}
              />
            </label>
            <button type="submit" className="button button--solid">
              Sign in
            </button>
          </form>
        </article>

        <article className="panel panel--accent">
          <div className="panel__heading">
            <h2>
              {invite?.usable ? "Accept client invite" : "Create an account"}
            </h2>
          </div>
          <form action={signUpAction} className="form-stack">
            {invite?.token ? (
              <input type="hidden" name="inviteToken" value={invite.token} />
            ) : null}
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                required
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                defaultValue={invite?.email ?? ""}
                readOnly={invite?.usable}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <small className="field__hint">At least 8 characters.</small>
            </label>
            {invite?.usable ? (
              <input type="hidden" name="role" value="client" />
            ) : (
              <label className="field">
                <span>Role</span>
                <select name="role" defaultValue="pm">
                  <option value="pm">Project manager</option>
                  <option value="client">Client</option>
                </select>
              </label>
            )}
            {!invite?.usable ? (
              <label className="field">
                <span>Organization name</span>
                <input
                  type="text"
                  name="organizationName"
                  autoComplete="organization"
                />
                <small className="field__hint">
                  Required when signing up as a project manager. Leave blank if
                  you are joining as a client.
                </small>
              </label>
            ) : (
              <article className="invite-banner">
                <strong>{invite.project_name}</strong>
                <span>
                  Organization: <code>{invite.organization_slug}</code>
                </span>
              </article>
            )}
            <label className="field">
              <span>Organization slug</span>
              <input
                type="text"
                name="organizationSlug"
                required
                defaultValue={invite?.organization_slug ?? ""}
                readOnly={invite?.usable}
              />
              <small className="field__hint">
                Project managers choose a new slug. Clients enter the slug their
                project manager gave them.
              </small>
            </label>
            <button type="submit" className="button button--solid">
              {invite?.usable ? "Accept invite" : "Create account"}
            </button>
          </form>
        </article>
      </section>
    </>
  );
}
