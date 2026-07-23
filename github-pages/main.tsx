import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  I18nProvider,
  LanguageSelect,
  type TranslationKey,
  useLanguage,
} from "../app/i18n";
import { LearnLesson } from "../app/learn/tutorial";
import { LocalGame } from "../app/play/local-game";
import "../app/globals.css";
import "./pages.css";

const benefits = [
  {
    icon: "◎",
    title: "pages.benefitRulesTitle",
    copy: "pages.benefitRulesCopy",
  },
  {
    icon: "◇",
    title: "pages.benefitWesternTitle",
    copy: "pages.benefitWesternCopy",
  },
  {
    icon: "↻",
    title: "pages.benefitPrivateTitle",
    copy: "pages.benefitPrivateCopy",
  },
] as const satisfies ReadonlyArray<{
  icon: string;
  title: TranslationKey;
  copy: TranslationKey;
}>;

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="site-shell pages-shell">
      <header className="site-header pages-header">
        <a className="brand" href="#top" aria-label={t("brand.home")}>
          <span className="brand-mark" aria-hidden="true">
            <i>楚</i>
            <i>漢</i>
          </span>
          <span className="brand-copy">
            <strong>楚漢 · Han vs Chu</strong>
            <small>DYNASTY CHESS</small>
          </span>
        </a>
        <nav
          className={`site-nav${menuOpen ? " open" : ""}`}
          aria-label={t("nav.main")}
        >
          <a href="#play" onClick={() => setMenuOpen(false)}>
            {t("nav.play")}
          </a>
          <a href="#learn" onClick={() => setMenuOpen(false)}>
            {t("nav.learn")}
          </a>
          <a
            href="https://github.com/maxwellzhung/xiangqi-arena"
            onClick={() => setMenuOpen(false)}
          >
            {t("pages.source")}
          </a>
        </nav>
        <div className="header-actions">
          <LanguageSelect compact />
          <span className="pages-local-pill">{t("pages.localEdition")}</span>
          <a className="button button-primary button-small" href="#play">
            {t("nav.playNow")}
          </a>
        </div>
        <button
          className="menu-button"
          type="button"
          aria-label={t("nav.menu")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>
      </header>

      <main id="top">
        <section
          className="pages-hero section-wrap"
          aria-labelledby="hero-title"
        >
          <div className="pages-hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> {t("home.guest")}
            </p>
            <h1 id="hero-title">
              {t("home.titleLine1")}
              <br />
              <em>{t("home.titleLine2")}</em>
            </h1>
            <p className="hero-brandline">{t("pages.brandline")}</p>
            <p className="pages-hero-lede">{t("home.lede")}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#play">
                {t("home.playNow")} <span aria-hidden="true">→</span>
              </a>
              <a className="button button-secondary" href="#learn">
                {t("home.exploreLesson")}
              </a>
            </div>
            <dl className="hero-stats" aria-label={t("home.benefits")}>
              <div>
                <dt>{t("home.statGuest")}</dt>
                <dd>{t("home.statGuestValue")}</dd>
              </div>
              <div>
                <dt>{t("home.rulesTitle")}</dt>
                <dd>{t("home.statLearnValue")}</dd>
              </div>
              <div>
                <dt>{t("home.guidanceTitle")}</dt>
                <dd>{t("home.guidanceCopy")}</dd>
              </div>
            </dl>
          </div>

          <aside
            className="pages-edition-card"
            aria-label={t("pages.editionLabel")}
          >
            <div className="pages-card-top">
              <div>
                <span className="match-kicker">{t("pages.editionLabel")}</span>
                <h2>{t("pages.playAnywhere")}</h2>
              </div>
              <span className="pages-ready">{t("pages.ready")}</span>
            </div>
            <div className="pages-orbit" aria-hidden="true">
              <span className="pages-orbit-piece red">R</span>
              <span className="pages-orbit-river">楚河 · 漢界</span>
              <span className="pages-orbit-piece black">G</span>
            </div>
            <ul className="pages-check-list">
              <li>
                <span>✓</span> {t("pages.checkGame")}
              </li>
              <li>
                <span>✓</span> {t("pages.checkRules")}
              </li>
              <li>
                <span>✓</span> {t("pages.checkLessons")}
              </li>
            </ul>
            <a className="button button-primary button-full" href="#play">
              {t("pages.openBoard")} <span aria-hidden="true">↓</span>
            </a>
            <p className="pages-card-note">{t("pages.cardNote")}</p>
          </aside>
        </section>

        <section className="pages-benefits" aria-label={t("home.benefits")}>
          {benefits.map((benefit) => (
            <article key={benefit.title}>
              <span aria-hidden="true">{benefit.icon}</span>
              <div>
                <b>{t(benefit.title)}</b>
                <small>{t(benefit.copy)}</small>
              </div>
            </article>
          ))}
        </section>

        <section id="play" className="pages-play-section section-wrap">
          <div className="pages-section-heading">
            <div>
              <p className="eyebrow">{t("intro.play.guidedEyebrow")}</p>
              <h2>{t("intro.play.guidedTitle")}</h2>
            </div>
            <p>{t("intro.play.guidedCopy")}</p>
          </div>
          <div className="pages-static-notice" role="status">
            <span aria-hidden="true">●</span>
            <p>
              <b>{t("pages.staticNoticeTitle")}</b>
              {t("pages.staticNoticeCopy")}
            </p>
          </div>
          <LocalGame solo />
        </section>

        <section id="learn" className="pages-learn section-wrap">
          <div className="section-heading">
            <p className="eyebrow">{t("intro.learn.eyebrow")}</p>
            <h2>{t("intro.learn.title")}</h2>
            <p>{t("intro.learn.copy")}</p>
          </div>
          <LearnLesson guidedGameHref="#play" />
          <a
            className="text-link centered"
            href="https://github.com/maxwellzhung/xiangqi-arena/blob/main/docs/XIANGQI_RULES.md"
          >
            {t("pages.readRules")} <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      <footer className="site-footer pages-footer">
        <a className="brand" href="#top" aria-label={t("brand.home")}>
          <span className="brand-mark" aria-hidden="true">
            <i>楚</i>
            <i>漢</i>
          </span>
          <span className="brand-copy">
            <strong>楚漢 · Han vs Chu</strong>
            <small>ANCIENT STRATEGY, PLAYED TODAY</small>
          </span>
        </a>
        <p>{t("pages.footerEdition")}</p>
        <nav aria-label={t("footer.navigation")}>
          <a href="#play">{t("nav.play")}</a>
          <a href="#learn">{t("nav.learn")}</a>
          <a href="https://github.com/maxwellzhung/xiangqi-arena">
            {t("pages.source")}
          </a>
        </nav>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <App />
  </I18nProvider>,
);
