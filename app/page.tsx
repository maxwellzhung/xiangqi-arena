"use client";

import Link from "next/link";
import { MiniBoard } from "./components/mini-board";
import { SiteFooter, SiteHeader } from "./components/site-chrome";
import { type TranslationKey, useLanguage } from "./i18n";

const differences: ReadonlyArray<{
  number: string;
  title: TranslationKey;
  copy: TranslationKey;
}> = [
  {
    number: "01",
    title: "home.diffBoardTitle",
    copy: "home.diffBoardCopy",
  },
  {
    number: "02",
    title: "home.diffCannonTitle",
    copy: "home.diffCannonCopy",
  },
  {
    number: "03",
    title: "home.diffStalemateTitle",
    copy: "home.diffStalemateCopy",
  },
];

export default function Home() {
  const { t } = useLanguage();
  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <section className="hero section-wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> {t("home.guest")}
            </p>
            <h1 id="hero-title">
              {t("home.titleLine1")}
              <br />
              <em>{t("home.titleLine2")}</em>
            </h1>
            <p className="hero-lede">{t("home.lede")}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/play">
                {t("home.playNow")} <span aria-hidden="true">→</span>
              </Link>
              <Link
                className="button button-secondary"
                href="/play?mode=private"
              >
                {t("home.private")}
              </Link>
            </div>
            <Link className="text-link" href="/learn">
              <span className="play-icon" aria-hidden="true">
                ▶
              </span>{" "}
              {t("home.learnLink")}
            </Link>
            <dl className="hero-stats" aria-label={t("home.waysToStart")}>
              <div>
                <dt>{t("home.statGuest")}</dt>
                <dd>{t("home.statGuestValue")}</dd>
              </div>
              <div>
                <dt>{t("home.statTime")}</dt>
                <dd>{t("home.statTimeValue")}</dd>
              </div>
              <div>
                <dt>{t("home.statLearn")}</dt>
                <dd>{t("home.statLearnValue")}</dd>
              </div>
            </dl>
          </div>

          <aside className="match-card" aria-label={t("home.quickMatch")}>
            <div className="match-card-top">
              <div>
                <span className="match-kicker">{t("home.quickMatch")}</span>
                <h2>{t("home.choosePace")}</h2>
              </div>
              <span className="match-online">{t("home.casual")}</span>
            </div>
            <MiniBoard />
            <div className="time-options" aria-label={t("home.timeControls")}>
              <Link href="/play?time=5" className="time-option">
                <span className="clock-icon">◷</span>
                <b>{t("home.fiveMin")}</b>
                <small>{t("home.fastSharp")}</small>
              </Link>
              <Link href="/play?time=10" className="time-option featured">
                <span className="popular-tag">{t("home.popular")}</span>
                <span className="clock-icon">◷</span>
                <b>{t("home.tenMin")}</b>
                <small>{t("home.roomThink")}</small>
              </Link>
              <Link href="/play?time=15" className="time-option">
                <span className="clock-icon">◷</span>
                <b>{t("home.fifteen")}</b>
                <small>{t("home.deepPlay")}</small>
              </Link>
            </div>
            <Link
              className="button button-primary button-full"
              href="/play?time=10"
            >
              {t("home.findOpponent")} <span aria-hidden="true">→</span>
            </Link>
            <p className="match-note">
              <span aria-hidden="true">♙</span> {t("home.guestNote")}
            </p>
          </aside>
        </section>

        <section className="trust-strip" aria-label={t("home.benefits")}>
          <div>
            <span aria-hidden="true">⚡</span>
            <p>
              <b>{t("home.speedTitle")}</b>
              <small>{t("home.speedCopy")}</small>
            </p>
          </div>
          <div>
            <span aria-hidden="true">◎</span>
            <p>
              <b>{t("home.guidanceTitle")}</b>
              <small>{t("home.guidanceCopy")}</small>
            </p>
          </div>
          <div>
            <span aria-hidden="true">♜</span>
            <p>
              <b>{t("home.rulesTitle")}</b>
              <small>{t("home.rulesCopy")}</small>
            </p>
          </div>
          <div>
            <span aria-hidden="true">↻</span>
            <p>
              <b>{t("home.reconnectTitle")}</b>
              <small>{t("home.reconnectCopy")}</small>
            </p>
          </div>
        </section>

        <section
          className="learn-teaser section-wrap"
          aria-labelledby="learn-title"
        >
          <div className="section-heading">
            <p className="eyebrow">{t("home.familiar")}</p>
            <h2 id="learn-title">{t("home.learnTitle")}</h2>
            <p>{t("home.learnCopy")}</p>
          </div>
          <div className="difference-grid">
            {differences.map((item) => (
              <article key={item.number} className="difference-card">
                <span>{item.number}</span>
                <h3>{t(item.title)}</h3>
                <p>{t(item.copy)}</p>
              </article>
            ))}
          </div>
          <Link className="text-link centered" href="/learn">
            {t("home.exploreLesson")} <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
