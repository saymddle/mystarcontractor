export function AuthForms({
  signInAction,
  signUpAction,
  message,
  error
}: {
  signInAction: (formData: FormData) => Promise<void>;
  signUpAction: (formData: FormData) => Promise<void>;
  message?: string;
  error?: string;
}) {
  return (
    <section className="auth-grid">
      <article className="panel">
        <p className="eyebrow">Sign in</p>
        <h2>Return to your workspace</h2>
        <form action={signInAction} className="form-stack">
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" name="password" required minLength={8} />
          </label>
          <button type="submit" className="button button--solid">
            Sign in
          </button>
        </form>
      </article>

      <article className="panel panel--warm">
        <p className="eyebrow">Create account</p>
        <h2>Set up a PM or client login</h2>
        <form action={signUpAction} className="form-stack">
          <label className="field">
            <span>Full name</span>
            <input type="text" name="fullName" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" name="password" required minLength={8} />
          </label>
          <label className="field">
            <span>Role</span>
            <select name="role" defaultValue="pm">
              <option value="pm">Project manager</option>
              <option value="client">Client</option>
            </select>
          </label>
          <label className="field">
            <span>Organization name</span>
            <input
              type="text"
              name="organizationName"
              placeholder="Required for PM sign-up"
            />
          </label>
          <label className="field">
            <span>Organization slug</span>
            <input
              type="text"
              name="organizationSlug"
              placeholder="Used by PMs to create or clients to join"
              required
            />
          </label>
          <button type="submit" className="button button--solid">
            Create account
          </button>
        </form>
      </article>

      {(message || error) && (
        <article className={`panel message-panel ${error ? "panel--error" : ""}`}>
          <p className="eyebrow">{error ? "Action failed" : "Status"}</p>
          <p className="message-copy">{error ?? message}</p>
        </article>
      )}
    </section>
  );
}
