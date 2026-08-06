/**
 * Shared result shape for server actions driven by `useActionState`.
 *
 * The split matters: `fieldErrors` are validation problems the user can fix in
 * a specific input, and render under that input. `message` is for everything
 * else (authorization, storage, upstream failures) and renders as a page-level
 * alert, because there is no field to attach it to.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  /** Page-level message. Server, authorization, or upstream failures. */
  message?: string;
  /** Per-input validation errors, keyed by the input's `name`. */
  fieldErrors?: Record<string, string>;
  /**
   * Submitted values echoed back so the form can repopulate. React resets an
   * uncontrolled form once its action resolves, so inputs bind these through
   * `defaultValue` to survive a failed submit. Never include secrets.
   */
  values?: Record<string, string>;
};

export const idleFormState: FormState = { status: "idle" };

export function fieldError(
  name: string,
  message: string,
  values?: Record<string, string>
): FormState {
  return { status: "error", fieldErrors: { [name]: message }, values };
}

export function formError(
  message: string,
  values?: Record<string, string>
): FormState {
  return { status: "error", message, values };
}
