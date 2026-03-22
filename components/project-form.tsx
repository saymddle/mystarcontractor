export function ProjectForm({
  createProjectAction
}: {
  createProjectAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <article className="panel">
      <p className="eyebrow">Create project</p>
      <h2>Start a new job and assign the client immediately.</h2>
      <form action={createProjectAction} className="form-grid">
        <label className="field">
          <span>Project name</span>
          <input type="text" name="name" required />
        </label>
        <label className="field">
          <span>Location</span>
          <input type="text" name="location" />
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
          <input
            type="email"
            name="clientEmail"
            placeholder="Optional existing client account"
          />
        </label>
        <button type="submit" className="button button--solid">
          Create project
        </button>
      </form>
    </article>
  );
}
