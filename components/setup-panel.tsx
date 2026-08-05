import Link from "next/link";

export function SetupPanel() {
  return (
    <section className="setup-panel">
      <h1>Connect Supabase to finish setup.</h1>
      <p className="hero-text">
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then run the SQL in{" "}
        <code>supabase/migrations/</code>.
      </p>
      <div className="hero-actions">
        <Link href="/" className="button button--solid">
          Back to overview
        </Link>
      </div>
    </section>
  );
}
