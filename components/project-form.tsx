export function ProjectForm({
  createProjectAction
}: {
  createProjectAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <article className="panel">
      <div className="panel__heading">
        <h2>Start a new job</h2>
        <p>Assign a client now, or leave it blank and assign one later.</p>
      </div>
      <form action={createProjectAction} className="form-grid">
        <label className="field">
          <span>Project name</span>
          <input type="text" name="name" required />
        </label>
        <label className="field">
          <span>Location</span>
          <input type="text" name="location" autoComplete="address-level2" />
        </label>
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue="not_started">
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="blocked">Blocked</option>
            <option value="complete">Complete</option>
          </select>
        </label>
        <label className="field">
          <span>Start date</span>
          <input type="date" name="startDate" />
        </label>
        <label className="field">
          <span>Target end date</span>
          <input type="date" name="targetEndDate" />
        </label>
        <label className="field">
          <span>Client email</span>
          <input type="email" name="clientEmail" autoComplete="off" />
          <small className="field__hint">
            Must already have an account. Use Invite client on the project page
            for someone new.
          </small>
        </label>
        <button type="submit" className="button button--solid">
          Create project
        </button>
      </form>
    </article>
  );
}
