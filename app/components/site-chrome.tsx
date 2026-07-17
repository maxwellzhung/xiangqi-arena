"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSelect, type TranslationKey, useLanguage } from "../i18n";

const navItems = [
  ["/play", "nav.play"],
  ["/learn", "nav.learn"],
  ["/leaderboard", "nav.leaderboard"],
] as const;

export function Brand() {
  const { t } = useLanguage();
  return (
    <Link href="/" className="brand" aria-label={t("brand.home")}>
      <span className="brand-mark" aria-hidden="true">
        <i>楚</i>
        <i>汉</i>
      </span>
      <span className="brand-copy" aria-hidden="true">
        <strong>楚汉</strong>
        <small>HAN VS CHU</small>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Prevent an early mobile-menu press from being lost during hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  return (
    <header className="site-header">
      <Brand />
      <button
        className="menu-button"
        type="button"
        aria-expanded={open}
        aria-controls="site-nav"
        disabled={!hydrated}
        onClick={() => setOpen(!open)}
      >
        <span className="sr-only">{t("nav.menu")}</span>
        <span aria-hidden="true">☰</span>
      </button>
      <nav
        id="site-nav"
        className={open ? "site-nav open" : "site-nav"}
        aria-label={t("nav.main")}
      >
        {navItems.map(([href, labelKey]) => (
          <Link
            key={href}
            className={pathname.startsWith(href) ? "active" : ""}
            href={href}
            onClick={() => setOpen(false)}
          >
            {t(labelKey)}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <LanguageSelect compact />
        <Link
          className="icon-button"
          href="/settings"
          aria-label={t("nav.settings")}
        >
          ⚙
        </Link>
        <Link className="sign-in" href="/profile">
          {t("nav.signIn")}
        </Link>
        <Link className="button button-small button-primary" href="/play">
          {t("nav.playNow")}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <Brand />
      <p>{t("footer.tagline")}</p>
      <nav aria-label={t("footer.navigation")}>
        <Link href="/learn">{t("footer.rules")}</Link>
        <Link href="/privacy">{t("footer.privacy")}</Link>
        <Link href="/terms">{t("footer.terms")}</Link>
        <Link href="/settings">{t("footer.settings")}</Link>
      </nav>
      <small>© 2026 楚汉 · Han vs Chu</small>
    </footer>
  );
}

export function PageIntro({
  eyebrow,
  title,
  copy,
  eyebrowKey,
  titleKey,
  copyKey,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  eyebrowKey?: TranslationKey;
  titleKey?: TranslationKey;
  copyKey?: TranslationKey;
}) {
  const { t } = useLanguage();
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrowKey ? t(eyebrowKey) : eyebrow}</p>
      <h1>{titleKey ? t(titleKey) : title}</h1>
      <p>{copyKey ? t(copyKey) : copy}</p>
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
