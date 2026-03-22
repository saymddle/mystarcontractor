import Link from "next/link";

const navItems = [
  { href: "#platform", label: "Platform" },
  { href: "#roles", label: "Roles" },
  { href: "#workflow", label: "Workflow" }
];

export function BrandHeader() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand__mark">MSC</span>
        <span>My Star Contractor</span>
      </Link>
      <nav className="topnav" aria-label="Primary">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
