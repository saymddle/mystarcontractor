import { describe, expect, it } from "vitest";
import { visibilityFilterFor } from "@/lib/visibility";
import type { AssetVisibility } from "@/lib/types";

/**
 * The access boundary. An internal document, photo, note or activity event
 * reaching a client is the worst thing this product can do, so these are the
 * first tests in the suite.
 *
 * Note what this does and does not prove. The real control is the
 * `can_view_project_asset` RLS policy in the database, and these tests cannot
 * reach it. They cover the application-layer constraint that sits in front of
 * it, so that a regression has to get past both. Proving the policy itself
 * needs an integration test against Postgres with the migrations applied.
 */
describe("visibilityFilterFor", () => {
  describe("a client", () => {
    it("is pinned to client_visible when no filter is requested", () => {
      expect(visibilityFilterFor("client")).toBe("client_visible");
    });

    it("is pinned to client_visible when asking for everything", () => {
      expect(visibilityFilterFor("client", "all")).toBe("client_visible");
    });

    it("cannot widen the filter by asking for internal", () => {
      // A hand-edited ?visibility=internal in the URL must not reach the query.
      expect(visibilityFilterFor("client", "internal")).toBe("client_visible");
    });

    it("stays pinned when asking for client_visible", () => {
      expect(visibilityFilterFor("client", "client_visible")).toBe("client_visible");
    });

    it("never returns null, for any input", () => {
      const inputs: Array<AssetVisibility | "all" | undefined> = [
        undefined,
        "all",
        "internal",
        "client_visible"
      ];

      for (const input of inputs) {
        expect(visibilityFilterFor("client", input)).toBe("client_visible");
      }
    });
  });

  describe("a project manager", () => {
    it("is unconstrained by default", () => {
      expect(visibilityFilterFor("pm")).toBeNull();
    });

    it("is unconstrained when asking for everything", () => {
      expect(visibilityFilterFor("pm", "all")).toBeNull();
    });

    it("can narrow to internal", () => {
      expect(visibilityFilterFor("pm", "internal")).toBe("internal");
    });

    it("can narrow to client_visible", () => {
      expect(visibilityFilterFor("pm", "client_visible")).toBe("client_visible");
    });
  });
});
