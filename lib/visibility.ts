import type { AssetVisibility, UserRole } from "@/lib/types";

/**
 * Decides the visibility constraint to put on an asset query.
 *
 * This is defence in depth, not the primary control. Visibility is enforced in
 * the database by the `can_view_project_asset` RLS policy, which is the thing
 * that actually protects the data. But that leaves exactly one mechanism
 * standing between an internal document and a client: one dropped policy, one
 * bad migration, one mistake in a `security definer` function and every
 * internal file, photo, note and activity event is readable by every client on
 * the project.
 *
 * Constraining the query here as well means two independent things have to
 * fail before anything leaks. It also pins the filter for clients regardless of
 * what arrives in the URL, so `?visibility=internal` cannot widen what a client
 * asks for.
 *
 * Returns the visibility to filter on, or null for no constraint.
 */
export function visibilityFilterFor(
  role: UserRole,
  requested?: AssetVisibility | "all"
): AssetVisibility | null {
  // A client may never read internal assets, whatever they asked for.
  if (role === "client") {
    return "client_visible";
  }

  if (requested && requested !== "all") {
    return requested;
  }

  return null;
}
