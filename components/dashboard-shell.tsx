import type { ReactNode } from "react";
import Link from "next/link";
import { BrandHeader } from "@/components/brand-header";

export function DashboardShell({
  role,
  intro,
  children
}: {
  role: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="dashboard-page">
      <BrandHeader />
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">{role}</p>
          <h1>{intro}</h1>
        </div>
        <Link href="/" className="ghost-link">
          Back to overview
        </Link>
      </section>
      <section className="dashboard-grid">{children}</section>
    </main>
  );
}
