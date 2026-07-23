import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LearnLesson } from "../app/learn/tutorial";
import { LocalGame } from "../app/play/local-game";
import "../app/globals.css";
import "./pages.css";

const benefits = [
  {
    icon: "◎",
    title: "Complete Xiangqi rules",
    copy: "Every move is checked by the same TypeScript engine as the full game.",
  },
  {
    icon: "◇",
    title: "Built for Western players",
    copy: "English piece labels, coordinates, legal moves, and plain-language feedback.",
  },
  {
    icon: "↻",
    title: "Private by design",
    copy: "This edition runs on your device. No account, cookies, or game upload.",
  },
] as const;

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="site-shell pages-shell">
      <header className="site-header pages-header">
        <a className="brand" href="#top" aria-label="Han vs Chu home">
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
          aria-label="Main navigation"
        >
          <a href="#play" onClick={() => setMenuOpen(false)}>
            Play
          </a>
          <a href="#learn" onClick={() => setMenuOpen(false)}>
            Learn
          </a>
          <a
            href="https://github.com/maxwellzhung/xiangqi-arena"
            onClick={() => setMenuOpen(false)}
          >
            Source
          </a>
        </nav>
        <div className="header-actions">
          <span className="pages-local-pill">LOCAL EDITION</span>
          <a className="button button-primary button-small" href="#play">
            Play now
          </a>
        </div>
        <button
          className="menu-button"
          type="button"
          aria-label="Menu"
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
              <span className="live-dot" /> Free local play · No account needed
            </p>
            <h1 id="hero-title">
              Cross the river.
              <br />
              <em>Claim the dynasty.</em>
            </h1>
            <p className="hero-brandline">
              Dynasty Chess <span aria-hidden="true">—</span> Ancient China
              Strategy Battle
            </p>
            <p className="pages-hero-lede">
              Learn and play Xiangqi—the strategy game behind the ancient
              rivalry of Chu and Han. Start against the board coach in seconds,
              with every legal move explained.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#play">
                Start guided game <span aria-hidden="true">→</span>
              </a>
              <a className="button button-secondary" href="#learn">
                Learn the differences
              </a>
            </div>
            <dl className="hero-stats" aria-label="Game features">
              <div>
                <dt>ACCESS</dt>
                <dd>No account</dd>
              </div>
              <div>
                <dt>RULES</dt>
                <dd>Full engine</dd>
              </div>
              <div>
                <dt>COACH</dt>
                <dd>Built in</dd>
              </div>
            </dl>
          </div>

          <aside
            className="pages-edition-card"
            aria-label="GitHub Pages edition"
          >
            <div className="pages-card-top">
              <div>
                <span className="match-kicker">GITHUB PAGES EDITION</span>
                <h2>Play anywhere</h2>
              </div>
              <span className="pages-ready">Ready</span>
            </div>
            <div className="pages-orbit" aria-hidden="true">
              <span className="pages-orbit-piece red">R</span>
              <span className="pages-orbit-river">楚河 · 漢界</span>
              <span className="pages-orbit-piece black">G</span>
            </div>
            <ul className="pages-check-list">
              <li>
                <span>✓</span> Full local game and board coach
              </li>
              <li>
                <span>✓</span> Legal moves, check, captures, and undo
              </li>
              <li>
                <span>✓</span> Nine interactive lessons and final assessment
              </li>
            </ul>
            <a className="button button-primary button-full" href="#play">
              Open the board <span aria-hidden="true">↓</span>
            </a>
            <p className="pages-card-note">
              Runs entirely in this browser. Online rooms need the full server
              deployment and are not shown here.
            </p>
          </aside>
        </section>

        <section className="pages-benefits" aria-label="Product benefits">
          {benefits.map((benefit) => (
            <article key={benefit.title}>
              <span aria-hidden="true">{benefit.icon}</span>
              <div>
                <b>{benefit.title}</b>
                <small>{benefit.copy}</small>
              </div>
            </article>
          ))}
        </section>

        <section id="play" className="pages-play-section section-wrap">
          <div className="pages-section-heading">
            <div>
              <p className="eyebrow">GUIDED LOCAL MATCH</p>
              <h2>Make your first move.</h2>
            </div>
            <p>
              You play Red. Select a piece, then choose a green destination. The
              coach replies as Black and can suggest a move when you want help.
            </p>
          </div>
          <div className="pages-static-notice" role="status">
            <span aria-hidden="true">●</span>
            <p>
              <b>Static local edition</b>
              Your match stays on this device. Online rooms, matchmaking, shared
              clocks, and cloud history require a server-capable host.
            </p>
          </div>
          <LocalGame solo />
        </section>

        <section id="learn" className="pages-learn section-wrap">
          <div className="section-heading">
            <p className="eyebrow">LEARN BY DOING · ABOUT 8 MINUTES</p>
            <h2>Learn by making real moves.</h2>
            <p>
              Choose a route for your experience level, practise every piece on
              a live board, and finish with a five-position readiness check.
              Your progress stays on this device.
            </p>
          </div>
          <LearnLesson guidedGameHref="#play" />
          <a
            className="text-link centered"
            href="https://github.com/maxwellzhung/xiangqi-arena/blob/main/docs/XIANGQI_RULES.md"
          >
            Read the complete rules <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      <footer className="site-footer pages-footer">
        <a className="brand" href="#top" aria-label="Back to top">
          <span className="brand-mark" aria-hidden="true">
            <i>楚</i>
            <i>漢</i>
          </span>
          <span className="brand-copy">
            <strong>楚漢 · Han vs Chu</strong>
            <small>ANCIENT STRATEGY, PLAYED TODAY</small>
          </span>
        </a>
        <p>Static local-play edition · Hosted on GitHub Pages</p>
        <nav aria-label="Footer navigation">
          <a href="#play">Play</a>
          <a href="#learn">Learn</a>
          <a href="https://github.com/maxwellzhung/xiangqi-arena">GitHub</a>
        </nav>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
