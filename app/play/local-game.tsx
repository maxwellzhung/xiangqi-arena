"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyMove,
  createInitialPosition,
  explainMove,
  formatMove,
  generateLegalMoves,
  getGameStatus,
  getPiece,
  isInCheck,
  type Move,
  type Position,
  type Square,
} from "@/packages/xiangqi-engine/src";
import { squareName, XiangqiBoard } from "./xiangqi-board";

type HistoryItem = {
  move: Move;
  label: string;
  captured: string | null;
  position: Position;
  gaveCheck: boolean;
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
  const [guideEnabled, setGuideEnabled] = useState(true);
  const [moveFeedback, setMoveFeedback] = useState<string | null>(null);
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
      setMoveFeedback(null);
      setAnnouncement(
        `${piece.color} ${piece.type} on ${squareName(square)} selected. ${generateLegalMoves(position, square).length} legal destinations.`,
      );
    } else {
      setSelected(null);
      setMoveFeedback(
        piece
          ? `It is ${position.turn === "red" ? "Red" : "Black"}’s turn. Choose a ${position.turn} piece.`
          : `${squareName(square)} is empty. Choose a ${position.turn} piece first.`,
      );
    }
  }
  function rejectMove(from: Square | null, to: Square) {
    const feedback = from
      ? explainMove(position, { from, to }).message
      : `It is ${position.turn === "red" ? "Red" : "Black"}’s turn. Choose a ${position.turn} piece.`;
    setMoveFeedback(feedback);
    setAnnouncement(`Move not allowed. ${feedback}`);
  }
  function makeMove(move: Move) {
    if (terminal) return;
    const piece = getPiece(position, move.from);
    const captured = getPiece(position, move.to);
    const label = formatMove(position, move, "western");
    const next = applyMove(position, move);
    const check = (() => {
      try {
        return isInCheck(next, next.turn);
      } catch {
        return false;
      }
    })();
    setPositionHistory([...positionHistory, position]);
    setPosition(next);
    setHistory([
      ...history,
      {
        move,
        label,
        captured: captured?.type ?? null,
        position: next,
        gaveCheck: check,
      },
    ]);
    setLastMove(move);
    setSelected(null);
    setMoveFeedback(null);
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
    setMoveFeedback(null);
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
  const guide = getFirstGameGuide(position, selected, history.length);

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
            aria-pressed={guideEnabled}
            onClick={() => setGuideEnabled(!guideEnabled)}
          >
            {guideEnabled ? "✓ Guide on" : "Guide off"}
          </button>
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
      <div className="piece-key" aria-label="Western piece key">
        <b>PIECE KEY</b>
        <span>
          <i>G</i> General
        </span>
        <span>
          <i>A</i> Advisor
        </span>
        <span>
          <i>E</i> Elephant
        </span>
        <span>
          <i>H</i> Horse
        </span>
        <span>
          <i>R</i> Rook
        </span>
        <span>
          <i>C</i> Cannon
        </span>
        <span>
          <i>S</i> Soldier
        </span>
        <small>Coordinates use files a–i and ranks 0–9.</small>
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
          {guideEnabled && !terminal && (
            <section className="first-game-guide" aria-live="polite">
              <span>{Math.min(history.length + 1, 4)} / 4</span>
              <div>
                <b>{guide.title}</b>
                <p>{guide.copy}</p>
              </div>
              <button
                type="button"
                aria-label="Hide first-game guide"
                onClick={() => setGuideEnabled(false)}
              >
                ×
              </button>
            </section>
          )}
          <div className={`turn-banner${status?.inCheck ? " in-check" : ""}`}>
            <b>{statusText}</b>
            <span>
              {selected
                ? `${squareName(selected)} selected · choose a green destination`
                : "Select a piece, then a highlighted destination"}
            </span>
          </div>
          {moveFeedback && (
            <div className="move-feedback" role="alert">
              <span aria-hidden="true">!</span>
              <p>
                <b>That move is not legal</b>
                {moveFeedback}
              </p>
              <button
                type="button"
                aria-label="Dismiss move explanation"
                onClick={() => setMoveFeedback(null)}
              >
                ×
              </button>
            </div>
          )}
          <XiangqiBoard
            position={position}
            selected={selected}
            legalMoves={legalMoves}
            lastMove={lastMove}
            styleMode={pieceStyle}
            orientation={orientation}
            onSelect={chooseSquare}
            onMove={makeMove}
            onReject={rejectMove}
            disabled={terminal}
          />
          {terminal && (
            <div className="game-result" role="status">
              <p className="eyebrow">GAME OVER</p>
              <h2>{statusText}</h2>
              <PostGameInsights history={history} />
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
                  {(item.captured || item.gaveCheck) && (
                    <small>{item.captured ? "capture" : "check"}</small>
                  )}
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

function getFirstGameGuide(
  position: Position,
  selected: Square | null,
  moveCount: number,
) {
  if (moveCount === 0 && !selected) {
    return {
      title: "Start with a Soldier",
      copy: "Red moves first. Select any S piece; green dots show every legal destination.",
    };
  }
  if (moveCount === 0) {
    const piece = selected ? getPiece(position, selected) : null;
    return {
      title: `${piece ? `${piece.type[0].toUpperCase()}${piece.type.slice(1)}` : "Piece"} selected`,
      copy: "Choose a green dot. A ring around an enemy piece means it can be captured.",
    };
  }
  if (moveCount === 1) {
    return {
      title: "Black replies",
      copy: "Try a Horse (H). It moves like a knight, but a neighboring piece can block its first straight step.",
    };
  }
  if (moveCount < 4) {
    return {
      title: "Open a Cannon line",
      copy: "Cannons move like Rooks. To capture, they must jump exactly one intervening piece called a screen.",
    };
  }
  return {
    title: "You have the essentials",
    copy: "Keep both Generals safe, develop Rooks and Cannons, and use the move explanations whenever a rule surprises you.",
  };
}

function PostGameInsights({ history }: { history: HistoryItem[] }) {
  const redCaptures = history.filter(
    (item) => item.captured && item.position.turn === "black",
  ).length;
  const blackCaptures = history.filter(
    (item) => item.captured && item.position.turn === "red",
  ).length;
  const checks = history.filter((item) => item.gaveCheck).length;
  const developed = new Set(
    history
      .filter((item) => {
        const mover = item.position.turn === "black" ? "red" : "black";
        return (
          item.move.from.row === (mover === "red" ? 9 : 0) &&
          item.move.from.column !== 4
        );
      })
      .map(
        (item) =>
          `${item.position.turn}-${item.move.from.column}-${item.move.from.row}`,
      ),
  ).size;
  return (
    <div className="post-game-insights" aria-label="Game insights">
      <div>
        <strong>{history.length}</strong>
        <span>moves played</span>
      </div>
      <div>
        <strong>
          {redCaptures}–{blackCaptures}
        </strong>
        <span>captures · Red–Black</span>
      </div>
      <div>
        <strong>{checks}</strong>
        <span>checks created</span>
      </div>
      <div>
        <strong>{developed}</strong>
        <span>back-rank pieces developed</span>
      </div>
      <p>
        {history.length < 8
          ? "Short game: review the final move and check whether a General was exposed early."
          : checks === 0
            ? "No checks appeared. Look for ways to activate a Rook or build a Cannon screen sooner."
            : "Use the move list to revisit each check and look for a safer reply."}
      </p>
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
