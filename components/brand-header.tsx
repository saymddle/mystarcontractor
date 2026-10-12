import Link from "next/link";

// Order matches the order these sections appear in the page.
const navItems = [
  { href: "#platform", label: "Platform" },
  { href: "#workflow", label: "Workflow" },
  { href: "#roles", label: "Roles" }
];

export function BrandHeader() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand__mark" aria-hidden="true">
          MSC
        </span>
        <span>My Star Contractor</span>
      </Link>
      <nav className="topnav" aria-label="Primary">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
        <Link href="/auth" className="ghost-link">
          Sign in
        </Link>
      </nav>
    </header>
  );
}
