import type { Metadata } from "next";
import { AppPage, PageIntro } from "../components/site-chrome";

export const metadata: Metadata = { title: "Leaderboard" };

const players = [
  ["1", "Mara V.", "🇩🇪", "2148", "68%", "12"],
  ["2", "Theo North", "🇬🇧", "2097", "64%", "8"],
  ["3", "Lina Chen", "🇨🇦", "2076", "61%", "5"],
  ["4", "Noah K.", "🇺🇸", "2042", "59%", "3"],
  ["5", "Émile R.", "🇫🇷", "2015", "57%", "1"],
  ["6", "Sofia Bell", "🇮🇹", "1989", "55%", "-2"],
];

export default function LeaderboardPage() {
  return (
    <AppPage>
      <PageIntro
        eyebrow="RATED 10+0 · THIS SEASON"
        title="The Han vs Chu leaderboard"
        copy="Ratings begin at 1500 and update only after completed rated games. Guest and casual games never affect the table."
        eyebrowKey="intro.leaderboard.eyebrow"
        titleKey="intro.leaderboard.title"
        copyKey="intro.leaderboard.copy"
      />
      <div className="leaderboard surface">
        <div className="table-head">
          <span>RANK</span>
          <span>PLAYER</span>
          <span>RATING</span>
          <span>WIN RATE</span>
          <span>7 DAYS</span>
        </div>
        {players.map(([rank, name, flag, rating, winRate, change]) => (
          <div className="table-row" key={rank}>
            <b>{rank}</b>
            <span className="player-cell">
              <i>{name[0]}</i>
              <span>
                <strong>{name}</strong>
                <small>{flag} Established player</small>
              </span>
            </span>
            <strong>{rating}</strong>
            <span>{winRate}</span>
            <span className={Number(change) >= 0 ? "rating-up" : "rating-down"}>
              {Number(change) >= 0 ? "+" : ""}
              {change}
            </span>
          </div>
        ))}
      </div>
      <p className="table-note">
        Preview data illustrates the ranked experience. Live rankings appear
        once rated account play is connected.
      </p>
    </AppPage>
  );
}
