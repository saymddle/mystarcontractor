import type { ReactNode } from "react";

type ControlAria = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

/**
 * Label, control, hint, and error as one unit, with the aria wiring done once.
 *
 * The control is a render prop so the caller stays in charge of the element
 * (input, select, textarea, file) while `Field` owns the ids that connect the
 * label, the hint, and the error message to it.
 */
export function Field({
  name,
  label,
  error,
  hint,
  children
}: {
  name: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (aria: ControlAria) => ReactNode;
}) {
  // The error replaces the hint rather than stacking under it. A hint and an
  // error usually restate the same rule ("At least 8 characters." above
  // "Use at least 8 characters."), and the error is the actionable one.
  const showHint = Boolean(hint) && !error;
  const hintId = showHint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ");

  const aria: ControlAria = {
    id: name,
    ...(error ? { "aria-invalid": true as const } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {})
  };

  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {children(aria)}
      {showHint ? (
        <small id={hintId} className="field__hint">
          {hint}
        </small>
      ) : null}
      {error ? (
        <small id={errorId} className="field__error">
          {error}
        </small>
      ) : null}
    </div>
  );
}
