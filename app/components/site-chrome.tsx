"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  ["/play", "Play"],
  ["/learn", "Learn"],
  ["/leaderboard", "Leaderboard"],
] as const;

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Xiangqi Arena home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
      </span>
      <span>
        Xiangqi <b>Arena</b>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Brand />
      <button
        className="menu-button"
        type="button"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen(!open)}
      >
        <span className="sr-only">Menu</span>
        <span aria-hidden="true">☰</span>
      </button>
      <nav
        id="site-nav"
        className={open ? "site-nav open" : "site-nav"}
        aria-label="Main navigation"
      >
        {navItems.map(([href, label]) => (
          <Link
            key={href}
            className={pathname.startsWith(href) ? "active" : ""}
            href={href}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="icon-button" href="/settings" aria-label="Settings">
          ⚙
        </Link>
        <Link className="sign-in" href="/profile">
          Sign in
        </Link>
        <Link className="button button-small button-primary" href="/play">
          Play now
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Brand />
      <p>Modern Xiangqi for curious minds.</p>
      <nav aria-label="Footer">
        <Link href="/learn">Rules</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/settings">Settings</Link>
      </nav>
      <small>© 2026 Xiangqi Arena</small>
    </footer>
  );
}

export function PageIntro({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

export function AppPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="page-main section-wrap">{children}</main>
      <SiteFooter />
    </div>
  );
}
