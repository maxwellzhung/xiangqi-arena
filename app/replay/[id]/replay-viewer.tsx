"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  applyMove,
  createInitialPosition,
  formatMove,
  generateLegalMoves,
  getPiece,
  isInCheck,
  type Move,
  type Position,
} from "@/packages/xiangqi-engine/src";
import { gameSnapshotSchema, type GameSnapshot } from "@/packages/shared/src";
import { XiangqiBoard } from "../../play/xiangqi-board";

export function ReplayViewer({ gameId }: { gameId: string }) {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const moves = useMemo<Move[]>(
    () => snapshot?.moves.map((item) => item.move) ?? [],
    [snapshot],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/games/${encodeURIComponent(gameId)}`, {
      credentials: "include",
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(
            body?.error?.message ??
              "This replay is unavailable for the current guest session.",
          );
        }
        const body = (await response.json()) as { snapshot?: unknown };
        const parsed = gameSnapshotSchema.safeParse(body.snapshot);
        if (!parsed.success) {
          throw new Error("The saved replay did not match the game contract.");
        }
        setSnapshot(parsed.data);
        setStep(parsed.data.moves.length);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "This replay could not be loaded.",
        );
      });
    return () => controller.abort();
  }, [gameId]);

  const positions = useMemo(() => {
    const values: Position[] = [createInitialPosition()];
    for (const move of moves) {
      try {
        values.push(applyMove(values[values.length - 1], move));
      } catch {
        break;
      }
    }
    return values;
  }, [moves]);
  const labels = useMemo(
    () =>
      moves
        .slice(0, positions.length - 1)
        .map((move, index) => formatMove(positions[index], move, "western")),
    [moves, positions],
  );
  const [orientation, setOrientation] = useState<"red" | "black">("red");
  const [pieceStyle, setPieceStyle] = useState<"western" | "traditional">(
    "traditional",
  );
  const currentStep = Math.min(step, positions.length - 1);
  useEffect(() => {
    function navigate(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setStep((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setStep((current) => Math.min(positions.length - 1, current + 1));
      }
      if (event.key === "Home") {
        event.preventDefault();
        setStep(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        setStep(positions.length - 1);
      }
    }
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [positions.length]);

  const currentInsight = useMemo(() => {
    if (currentStep === 0) {
      return {
        title: "Initial position",
        copy: "Red moves first. Both armies begin mirrored across the river.",
      };
    }
    const move = moves[currentStep - 1];
    const before = positions[currentStep - 1];
    const after = positions[currentStep];
    const piece = getPiece(before, move.from);
    const captured = getPiece(before, move.to);
    const check = isInCheck(after, after.turn);
    const pieceLesson: Record<string, string> = {
      cannon:
        "The Cannon has changed files. Watch which piece could become its future capture screen.",
      horse:
        "This develops a Horse away from the back rank; its adjacent leg squares still control where it can go.",
      soldier:
        "The Soldier advanced toward the river. It gains sideways movement only after crossing.",
    };
    return {
      title: `${piece ? `${piece.type[0].toUpperCase()}${piece.type.slice(1)}` : "Piece"} moved ${labels[currentStep - 1]}`,
      copy: `${captured ? `It captured a ${captured.type}. ` : ""}${check ? "The move gives check. " : ""}${piece ? (pieceLesson[piece.type] ?? "Compare the highlighted start and destination intersections.") : ""}`,
    };
  }, [currentStep, labels, moves, positions]);

  const reviewFacts = useMemo(() => {
    let checks = 0;
    let captures = 0;
    for (let index = 1; index < positions.length; index += 1) {
      if (getPiece(positions[index - 1], moves[index - 1].to)) captures++;
      if (isInCheck(positions[index], positions[index].turn)) checks++;
    }
    return {
      checks,
      captures,
      legalReplies: generateLegalMoves(positions[positions.length - 1]).length,
    };
  }, [moves, positions]);

  if (!snapshot) {
    return (
      <section className="surface replay-load-state" aria-live="polite">
        <p className="eyebrow">PRIVATE GAME RECORD</p>
        <h2>{loadError ? "Replay unavailable" : "Loading replay…"}</h2>
        <p>
          {loadError ??
            "Restoring the authoritative move list saved for this game."}
        </p>
        {loadError && (
          <Link className="button button-secondary" href="/profile">
            View your game history
          </Link>
        )}
      </section>
    );
  }

  const replayComplete = positions.length === moves.length + 1;
  return (
    <div className="replay-layout">
      <div>
        <section className="replay-insight" aria-live="polite">
          <div>
            <span>LEARNING NOTE · NOT AN ENGINE EVALUATION</span>
            <h2>{currentInsight.title}</h2>
            <p>{currentInsight.copy}</p>
          </div>
          <div className="replay-style-controls">
            <button
              type="button"
              onClick={() =>
                setPieceStyle(
                  pieceStyle === "western" ? "traditional" : "western",
                )
              }
            >
              {pieceStyle === "western" ? "帥 Traditional" : "G Western"}
            </button>
            <button
              type="button"
              onClick={() =>
                setOrientation(orientation === "red" ? "black" : "red")
              }
            >
              ↕ Flip board
            </button>
          </div>
        </section>
        <XiangqiBoard
          position={positions[currentStep]}
          lastMove={currentStep ? moves[currentStep - 1] : null}
          orientation={orientation}
          styleMode={pieceStyle}
          disabled
        />
        <div className="replay-controls">
          <button
            type="button"
            onClick={() => setStep(0)}
            disabled={currentStep === 0}
            aria-label="First position"
          >
            ↤
          </button>
          <button
            type="button"
            onClick={() => setStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            aria-label="Previous move"
          >
            ←
          </button>
          <span>
            Position {currentStep} of {moves.length}
          </span>
          <button
            type="button"
            onClick={() =>
              setStep(Math.min(positions.length - 1, currentStep + 1))
            }
            disabled={currentStep === positions.length - 1}
            aria-label="Next move"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setStep(positions.length - 1)}
            disabled={currentStep === positions.length - 1}
            aria-label="Final position"
          >
            ↦
          </button>
          <label className="replay-scrubber">
            <span className="sr-only">Replay position</span>
            <input
              type="range"
              min="0"
              max={positions.length - 1}
              value={currentStep}
              onChange={(event) => setStep(Number(event.target.value))}
            />
          </label>
        </div>
        <p className="replay-shortcuts">
          Keyboard: ← previous · → next · Home start · End finish
        </p>
      </div>
      <aside className="move-panel replay-panel">
        <div className="move-panel-head">
          <span>REPLAY MOVES</span>
          <b>
            {currentStep} / {moves.length}
          </b>
        </div>
        <ol>
          <li className={currentStep === 0 ? "active" : ""}>
            <button type="button" onClick={() => setStep(0)}>
              <span>0</span>
              <b>Initial position</b>
            </button>
          </li>
          {labels.map((label, index) => (
            <li
              key={`${label}-${index}`}
              className={currentStep === index + 1 ? "active" : ""}
            >
              <button type="button" onClick={() => setStep(index + 1)}>
                <span>{index + 1}</span>
                <b>{label}</b>
              </button>
            </li>
          ))}
        </ol>
        <div className="practice-note">
          <b>Position record</b>
          <p>
            This replay uses the exact authoritative move list saved for your
            game.{" "}
            {replayComplete
              ? "Every move verified."
              : "A saved move could not be reconstructed."}
          </p>
        </div>
        <div className="replay-facts" aria-label="Replay summary">
          <p className="eyebrow">GAME INSIGHTS</p>
          <dl>
            <div>
              <dt>Moves</dt>
              <dd>{moves.length}</dd>
            </div>
            <div>
              <dt>Captures</dt>
              <dd>{reviewFacts.captures}</dd>
            </div>
            <div>
              <dt>Checks</dt>
              <dd>{reviewFacts.checks}</dd>
            </div>
            <div>
              <dt>Legal replies now</dt>
              <dd>{reviewFacts.legalReplies}</dd>
            </div>
          </dl>
          <p>
            {snapshot.result
              ? `Result: ${snapshot.result.replaceAll("-", " ")} by ${snapshot.terminationReason?.replaceAll("-", " ") ?? "adjudication"}.`
              : "This game is still active; the saved replay will grow as moves are accepted."}
          </p>
        </div>
      </aside>
      <p className="sr-only" aria-live="polite">
        Showing position {currentStep} of {moves.length}. {currentInsight.title}
        .
      </p>
    </div>
  );
}
