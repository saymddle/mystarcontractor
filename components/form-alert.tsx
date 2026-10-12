import type { FormState } from "@/lib/form-state";

/**
 * Form-level feedback: failures that belong to no single input, and success
 * confirmations for forms that stay on the page after submitting.
 */
export function FormAlert({ state }: { state: FormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      className={`inline-alert inline-alert--${state.status === "error" ? "error" : "success"}`}
      role="alert"
    >
      {state.message}
    </div>
  );
}
