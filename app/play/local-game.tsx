"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyMove,
  createInitialPosition,
  formatMove,
  generateLegalMoves,
  getGameStatus,
  getPiece,
  isInCheck,
  type Move,
  type Position,
  type Square,
} from "@/packages/xiangqi-engine/src";
import { XiangqiBoard } from "./xiangqi-board";

type HistoryItem = {
  move: Move;
  label: string;
  captured: string | null;
  position: Position;
};
type Dialog = "resign" | "draw" | null;

export function LocalGame({ onExit }: { onExit?: () => void }) {
  const [position, setPosition] = useState(() => createInitialPosition());
  const [positionHistory, setPositionHistory] = useState<Position[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [pieceStyle, setPieceStyle] = useState<"western" | "traditional">(
    "western",
  );
  const [orientation, setOrientation] = useState<"red" | "black">("red");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [manualResult, setManualResult] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState(
    "Red to move. Select a piece.",
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const legalMoves = selected ? generateLegalMoves(position, selected) : [];
  const status = manualResult ? null : getGameStatus(position, positionHistory);
  const terminal = !!manualResult || status?.isTerminal;

  useEffect(() => {
    if (!dialog) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  });
  function openDialog(value: Dialog, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setDialog(value);
  }
  function closeDialog() {
    setDialog(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  function chooseSquare(square: Square) {
    const piece = getPiece(position, square);
    if (piece?.color === position.turn) {
      setSelected(square);
      setAnnouncement(
        `${piece.color} ${piece.type} selected. ${generateLegalMoves(position, square).length} legal destinations.`,
      );
    } else {
      setSelected(null);
    }
  }
  function makeMove(move: Move) {
    if (terminal) return;
    const piece = getPiece(position, move.from);
    const captured = getPiece(position, move.to);
    const label = formatMove(position, move, "western");
    const next = applyMove(position, move);
    setPositionHistory([...positionHistory, position]);
    setPosition(next);
    setHistory([
      ...history,
      { move, label, captured: captured?.type ?? null, position: next },
    ]);
    setLastMove(move);
    setSelected(null);
    const check = (() => {
      try {
        return isInCheck(next, next.turn);
      } catch {
        return false;
      }
    })();
    setAnnouncement(
      `${piece?.color} ${piece?.type} moved ${label}.${captured ? ` Captured ${captured.color} ${captured.type}.` : ""}${check ? ` ${next.turn} is in check.` : ` ${next.turn} to move.`}`,
    );
  }
  function reset() {
    setPosition(createInitialPosition());
    setPositionHistory([]);
    setHistory([]);
    setSelected(null);
    setLastMove(null);
    setManualResult(null);
    setAnnouncement("New game. Red to move.");
    setDialog(null);
  }
  const capturedByRed = history
    .filter((item) => item.captured && item.position.turn === "black")
    .map((item) => item.captured!);
  const capturedByBlack = history
    .filter((item) => item.captured && item.position.turn === "red")
    .map((item) => item.captured!);
  const statusText =
    manualResult ??
    (status?.isTerminal
      ? `${status.winner === "red" ? "Red" : "Black"} wins by ${status.terminationReason}.`
      : `${position.turn === "red" ? "Red" : "Black"} to move${status?.inCheck ? " · Check" : ""}`);

  return (
    <div className="local-game">
      <div className="game-topbar">
        <div>
          {onExit && (
            <button className="back-button" type="button" onClick={onExit}>
              ← Lobby
            </button>
          )}
          <span className="status-chip">LOCAL · CASUAL</span>
        </div>
        <div className="game-toolbar">
          <button
            type="button"
            onClick={() =>
              setOrientation(orientation === "red" ? "black" : "red")
            }
            aria-label="Flip board orientation"
          >
            ↕ Flip
          </button>
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
        </div>
      </div>
      <div className="game-layout">
        <aside className="player-column">
          <PlayerCard
            color="black"
            turn={position.turn === "black" && !terminal}
            captured={capturedByRed}
          />
          <div className="game-actions">
            <button
              type="button"
              onClick={(event) => openDialog("draw", event.currentTarget)}
              disabled={terminal}
            >
              Offer draw
            </button>
            <button
              type="button"
              onClick={(event) => openDialog("resign", event.currentTarget)}
              disabled={terminal}
            >
              Resign
            </button>
          </div>
          <PlayerCard
            color="red"
            turn={position.turn === "red" && !terminal}
            captured={capturedByBlack}
          />
        </aside>
        <div>
          <XiangqiBoard
            position={position}
            selected={selected}
            legalMoves={legalMoves}
            lastMove={lastMove}
            styleMode={pieceStyle}
            orientation={orientation}
            onSelect={chooseSquare}
            onMove={makeMove}
            disabled={terminal}
          />
          {terminal && (
            <div className="game-result" role="status">
              <p className="eyebrow">GAME OVER</p>
              <h2>{statusText}</h2>
              <button
                className="button button-primary"
                type="button"
                onClick={reset}
              >
                Start rematch
              </button>
            </div>
          )}
        </div>
        <aside className="move-panel">
          <div className="move-panel-head">
            <span>MOVE HISTORY</span>
            <b>{history.length} moves</b>
          </div>
          <ol aria-label="Move history">
            {history.length === 0 ? (
              <li className="empty-moves">Select a red piece to begin.</li>
            ) : (
              history.map((item, index) => (
                <li key={index}>
                  <span>{index + 1}</span>
                  <b>{item.label}</b>
                  {item.captured && <small>capture</small>}
                </li>
              ))
            )}
          </ol>
          <div className="practice-note">
            <b>Local practice</b>
            <p>
              This board uses the production rules engine. Hosted clocks and
              multiplayer state stay server-authoritative when connected.
            </p>
          </div>
        </aside>
      </div>
      <p className="sr-only" aria-live="assertive">
        {announcement}
      </p>
      {dialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div
            className="game-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <p className="eyebrow">LOCAL GAME</p>
            <h2 id="dialog-title">
              {dialog === "resign"
                ? `${position.turn === "red" ? "Red" : "Black"}, resign this game?`
                : "Accept a draw?"}
            </h2>
            <p>
              {dialog === "resign"
                ? "Resignation ends the game immediately as a loss for the side to move."
                : "On one shared device, the other player can accept or continue the game."}
            </p>
            <div>
              <button
                className="button button-secondary"
                type="button"
                onClick={closeDialog}
              >
                Continue game
              </button>
              <button
                className="button button-primary"
                type="button"
                autoFocus
                onClick={() => {
                  setManualResult(
                    dialog === "draw"
                      ? "Game drawn by agreement."
                      : `${position.turn === "red" ? "Black" : "Red"} wins by resignation.`,
                  );
                  closeDialog();
                }}
              >
                {dialog === "draw" ? "Accept draw" : "Resign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCard({
  color,
  turn,
  captured,
}: {
  color: "red" | "black";
  turn: boolean;
  captured: string[];
}) {
  return (
    <section
      className={`player-card ${turn ? "current" : ""}`}
      aria-label={`${color} player${turn ? ", current turn" : ""}`}
    >
      <div className={`player-token ${color}`}>
        {color === "red" ? "R" : "B"}
      </div>
      <div>
        <small>{color.toUpperCase()}</small>
        <h3>{color === "red" ? "Player one" : "Player two"}</h3>
        <p>{turn ? "Your turn" : "Waiting"}</p>
      </div>
      <span className="practice-clock">∞</span>
      <div className="captured-row">
        <b>Captured</b>
        <span>
          {captured.length
            ? captured.map((piece, index) => (
                <i key={index}>{piece[0].toUpperCase()}</i>
              ))
            : "—"}
        </span>
      </div>
    </section>
  );
}
