"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  Color,
  GameResult,
  TerminationReason,
  TimeControlId,
} from "@/packages/shared/src";

type HistoryGame = {
  gameId: string;
  status: "waiting" | "active" | "completed";
  result: GameResult | null;
  terminationReason: TerminationReason | null;
  timeControlId: TimeControlId;
  rated: boolean;
  createdAt: string;
  endedAt: string | null;
  color: Color;
};

const timeControlNames: Record<TimeControlId, string> = {
  "blitz-5": "5+0",
  "rapid-10": "10+0",
  "classic-15-10": "15+10",
};

function outcome(game: HistoryGame): "Win" | "Loss" | "Draw" | "Active" {
  if (game.status !== "completed" || !game.result) return "Active";
  if (game.result === "draw") return "Draw";
  return game.result === `${game.color}-win` ? "Win" : "Loss";
}

export function GameHistory() {
  const [games, setGames] = useState<HistoryGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/games", {
      credentials: "include",
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) return { games: [] };
        if (!response.ok) throw new Error("Your saved games are unavailable.");
        return (await response.json()) as { games?: unknown };
      })
      .then((body) => {
        if (!Array.isArray(body.games)) {
          throw new Error("The game-history response was invalid.");
        }
        setGames(body.games as HistoryGame[]);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Your saved games are unavailable.",
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const completed = games.filter((game) => game.status === "completed");
    const wins = completed.filter((game) => outcome(game) === "Win").length;
    return {
      completed: completed.length,
      wins,
      winRate: completed.length
        ? Math.round((wins / completed.length) * 100)
        : 0,
    };
  }, [games]);

  return (
    <section className="surface game-history" aria-labelledby="history-title">
      <div className="game-history-head">
        <div>
          <p className="eyebrow">THIS DEVICE</p>
          <h2 id="history-title">Your saved games</h2>
          <p>
            Casual guest games remain attached to your secure guest session on
            this browser.
          </p>
        </div>
        <dl aria-label="Game history summary">
          <div>
            <dt>Completed</dt>
            <dd>{summary.completed}</dd>
          </div>
          <div>
            <dt>Wins</dt>
            <dd>{summary.wins}</dd>
          </div>
          <div>
            <dt>Win rate</dt>
            <dd>{summary.completed ? `${summary.winRate}%` : "—"}</dd>
          </div>
        </dl>
      </div>

      {loading ? (
        <p className="history-state" role="status">
          Loading your games…
        </p>
      ) : error ? (
        <p className="history-state" role="alert">
          {error}
        </p>
      ) : games.length === 0 ? (
        <div className="history-empty">
          <span aria-hidden="true">♜</span>
          <div>
            <h3>No saved games yet</h3>
            <p>Your first online casual game will appear here automatically.</p>
          </div>
          <Link className="button button-primary" href="/play">
            Play a casual game
          </Link>
        </div>
      ) : (
        <ol className="history-list">
          {games.map((game) => {
            const result = outcome(game);
            return (
              <li key={game.gameId}>
                <span
                  className={`history-result result-${result.toLowerCase()}`}
                >
                  {result}
                </span>
                <span>
                  <b>
                    {game.color === "red" ? "Red" : "Black"} ·{" "}
                    {timeControlNames[game.timeControlId]}
                  </b>
                  <small>
                    {game.rated ? "Rated" : "Casual"}
                    {game.terminationReason
                      ? ` · ${game.terminationReason.replaceAll("-", " ")}`
                      : ""}
                  </small>
                </span>
                <time dateTime={game.endedAt ?? game.createdAt}>
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(game.endedAt ?? game.createdAt))}
                </time>
                <Link
                  className="button button-secondary"
                  href={
                    game.status === "active"
                      ? `/game/${game.gameId}`
                      : `/replay/${game.gameId}`
                  }
                >
                  {game.status === "active" ? "Resume" : "Replay"}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
