import Link from "next/link";
import { MiniBoard } from "./components/mini-board";
import { SiteFooter, SiteHeader } from "./components/site-chrome";

const differences = [
  {
    number: "01",
    title: "The board is alive",
    copy: "Pieces play on intersections. The river and two palaces shape every attack.",
  },
  {
    number: "02",
    title: "Cannons need a screen",
    copy: "A Cannon captures by leaping exactly one piece. It changes how every file feels.",
  },
  {
    number: "03",
    title: "No quiet stalemate",
    copy: "If you have no legal move, you lose. Xiangqi rewards active, tactical play.",
  },
];

export default function Home() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <section className="hero section-wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> Free guest play · No account needed
            </p>
            <h1 id="hero-title">
              The fastest way
              <br />
              into <em>Xiangqi.</em>
            </h1>
            <p className="hero-lede">
              Chinese Chess is fast, tactical, and surprisingly easy to begin.
              Play a real game in seconds, with clear guidance built in.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/play">
                Play now <span aria-hidden="true">→</span>
              </Link>
              <Link
                className="button button-secondary"
                href="/play?mode=private"
              >
                Create private game
              </Link>
            </div>
            <Link className="text-link" href="/learn">
              <span className="play-icon" aria-hidden="true">
                ▶
              </span>{" "}
              New to Xiangqi? Learn the rules in 5 minutes
            </Link>
            <dl className="hero-stats" aria-label="Platform activity">
              <div>
                <dt>PLAYERS ONLINE</dt>
                <dd>
                  <span className="live-dot" /> 1,284
                </dd>
              </div>
              <div>
                <dt>GAMES TODAY</dt>
                <dd>8,691</dd>
              </div>
              <div>
                <dt>AVERAGE GAME</dt>
                <dd>11 min</dd>
              </div>
            </dl>
          </div>

          <aside className="match-card" aria-label="Start a quick match">
            <div className="match-card-top">
              <div>
                <span className="match-kicker">QUICK MATCH</span>
                <h2>Choose your pace</h2>
              </div>
              <span className="match-online">
                <span className="live-dot" /> 42 waiting
              </span>
            </div>
            <MiniBoard />
            <div className="time-options" aria-label="Time controls">
              <Link href="/play?time=5" className="time-option">
                <span className="clock-icon">◷</span>
                <b>5 min</b>
                <small>Fast & sharp</small>
              </Link>
              <Link href="/play?time=10" className="time-option featured">
                <span className="popular-tag">POPULAR</span>
                <span className="clock-icon">◷</span>
                <b>10 min</b>
                <small>Room to think</small>
              </Link>
              <Link href="/play?time=15" className="time-option">
                <span className="clock-icon">◷</span>
                <b>15+10</b>
                <small>Deep play</small>
              </Link>
            </div>
            <Link
              className="button button-primary button-full"
              href="/play?time=10"
            >
              Find an opponent <span aria-hidden="true">→</span>
            </Link>
            <p className="match-note">
              <span aria-hidden="true">♙</span> You’ll play as a guest · Casual
              game
            </p>
          </aside>
        </section>

        <section className="trust-strip" aria-label="Product benefits">
          <div>
            <span aria-hidden="true">⚡</span>
            <p>
              <b>Instant pairing</b>
              <small>Find a match in seconds</small>
            </p>
          </div>
          <div>
            <span aria-hidden="true">◎</span>
            <p>
              <b>Learn as you play</b>
              <small>Legal moves shown on board</small>
            </p>
          </div>
          <div>
            <span aria-hidden="true">♜</span>
            <p>
              <b>Real Xiangqi rules</b>
              <small>Complete, server-validated play</small>
            </p>
          </div>
          <div>
            <span aria-hidden="true">↻</span>
            <p>
              <b>Reconnect safely</b>
              <small>Your game stays in sync</small>
            </p>
          </div>
        </section>

        <section
          className="learn-teaser section-wrap"
          aria-labelledby="learn-title"
        >
          <div className="section-heading">
            <p className="eyebrow">FAMILIAR, BUT FRESH</p>
            <h2 id="learn-title">Chess instincts. A whole new board.</h2>
            <p>
              If you know Western chess, you already have a head start. Here are
              three differences that make Xiangqi thrilling.
            </p>
          </div>
          <div className="difference-grid">
            {differences.map((item) => (
              <article key={item.number} className="difference-card">
                <span>{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
          <Link className="text-link centered" href="/learn">
            Explore the interactive lesson <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
