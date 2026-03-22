import Link from "next/link";

export function SetupPanel() {
  return (
    <section className="setup-panel">
      <p className="eyebrow">Supabase setup required</p>
      <h1>Connect the project to Supabase to unlock Phase 1.</h1>
      <p className="hero-text">
        Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then
        run the SQL in `supabase/migrations/0001_phase1_foundation.sql`.
      </p>
      <div className="hero-actions">
        <Link href="/" className="button button--solid">
          Back to overview
        </Link>
      </div>
    </section>
  );
}
