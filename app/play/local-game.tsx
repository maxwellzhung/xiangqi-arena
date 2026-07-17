"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyMove,
  choosePracticeMove,
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

export function LocalGame({
  onExit,
  solo = false,
}: {
  onExit?: () => void;
  solo?: boolean;
}) {
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
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [announcement, setAnnouncement] = useState(
    "Red to move. Select a piece.",
  );
  const [hydrated, setHydrated] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const legalMoves = selected ? generateLegalMoves(position, selected) : [];
  const status = manualResult ? null : getGameStatus(position, positionHistory);
  const terminal = !!manualResult || status?.isTerminal;
  const aiThinking = solo && position.turn === "black" && !terminal;
  const inputDisabled = !hydrated || terminal || aiThinking;

  useEffect(() => {
    // Keep the server-rendered board inert until React can handle input.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!solo || position.turn !== "black" || terminal) return;
    const timer = window.setTimeout(() => {
      const reply = choosePracticeMove(position, history.length);
      if (reply) makeMove(reply);
    }, 520);
    return () => window.clearTimeout(timer);
    // The move application intentionally uses the position captured for this turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length, position, solo, terminal]);

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
      setCoachNote(null);
      setHintMove(null);
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
    setCoachNote(null);
    setHintMove(null);
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
    setCoachNote(null);
    setHintMove(null);
    setAnnouncement("New game. Red to move.");
    setDialog(null);
  }
  function undoMove() {
    if (!history.length || aiThinking) return;
    const removeCount = solo ? Math.min(2, history.length) : 1;
    const remaining = history.slice(0, history.length - removeCount);
    const restored = remaining.length
      ? remaining[remaining.length - 1].position
      : createInitialPosition();
    setPosition(restored);
    setHistory(remaining);
    setPositionHistory(
      positionHistory.slice(
        0,
        Math.max(0, positionHistory.length - removeCount),
      ),
    );
    setLastMove(remaining.length ? remaining[remaining.length - 1].move : null);
    setSelected(null);
    setManualResult(null);
    setMoveFeedback(null);
    setHintMove(null);
    setCoachNote(
      solo
        ? "Position restored to your previous turn. Try a different plan."
        : "The last move was undone.",
    );
    setAnnouncement("Move undone. Red to move.");
  }
  function showCoachHint() {
    if (terminal || aiThinking || (solo && position.turn !== "red")) return;
    const suggestion = choosePracticeMove(position, history.length);
    if (!suggestion) return;
    setSelected(suggestion.from);
    setHintMove(suggestion);
    setCoachNote(
      `Try ${squareName(suggestion.from)} → ${squareName(suggestion.to)}. The gold rings mark the suggested move; you can still choose any legal move.`,
    );
    setAnnouncement(
      `Coach hint: move from ${squareName(suggestion.from)} to ${squareName(suggestion.to)}.`,
    );
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
  const guide = getFirstGameGuide(
    position,
    selected,
    history.length,
    Boolean(status?.inCheck),
    aiThinking,
    solo,
  );

  return (
    <div className="local-game">
      <div className="game-topbar">
        <div>
          {onExit && (
            <button className="back-button" type="button" onClick={onExit}>
              ← Lobby
            </button>
          )}
          <span className="status-chip">
            {solo ? "GUIDED · VS COACH" : "LOCAL · CASUAL"}
          </span>
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
            name={solo ? "Coach bot" : "Player two"}
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
            name={solo ? "You" : "Player one"}
            turn={position.turn === "red" && !terminal}
            captured={capturedByBlack}
          />
        </aside>
        <div>
          {guideEnabled && !terminal && (
            <section className="first-game-guide" aria-live="polite">
              <span>
                {solo ? "LIVE" : `${Math.min(history.length + 1, 4)} / 4`}
              </span>
              <div>
                <b>{guide.title}</b>
                <p>{coachNote ?? guide.copy}</p>
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
              {aiThinking
                ? "Coach is choosing a reply…"
                : selected
                  ? `${squareName(selected)} selected · choose a green destination`
                  : "Select a piece, then a highlighted destination"}
            </span>
          </div>
          {solo && !terminal && (
            <div className="coach-strip" aria-live="polite">
              <div>
                <b>
                  {aiThinking ? "Coach is choosing a reply…" : "Board coach"}
                </b>
                <p>
                  {coachNote ??
                    "Ask for a suggested move or undo the last pair of moves and try another plan."}
                </p>
              </div>
              <button
                type="button"
                onClick={showCoachHint}
                disabled={aiThinking || position.turn !== "red"}
              >
                Show a move
              </button>
              <button
                type="button"
                onClick={undoMove}
                disabled={!history.length || aiThinking}
              >
                Undo turn
              </button>
            </div>
          )}
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
            hintSquares={hintMove ? [hintMove.from, hintMove.to] : []}
            disabled={inputDisabled}
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
            <b>{solo ? "Solo coached practice" : "Local practice"}</b>
            <p>
              {solo
                ? "You play Red. The coach replies as Black, while Undo, Hint, and move explanations stay available throughout the game."
                : "This board uses the production rules engine. Hosted clocks and multiplayer state stay server-authoritative when connected."}
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
  inCheck = false,
  aiThinking = false,
  solo = false,
) {
  if (aiThinking) {
    return {
      title: "Coach is reading the board",
      copy: "Black will reply automatically. Your controls unlock when the move is complete.",
    };
  }
  if (inCheck) {
    return {
      title: "Your General is in check",
      copy: "Only moves that remove the check are legal. Use the green destinations to find a safe reply.",
    };
  }
  if (selected) {
    const piece = getPiece(position, selected);
    const moves = generateLegalMoves(position, selected);
    const captures = moves.filter((move) => getPiece(position, move.to)).length;
    return {
      title: `${piece ? `${piece.type[0].toUpperCase()}${piece.type.slice(1)}` : "Piece"} on ${squareName(selected)}`,
      copy: captures
        ? `${moves.length} legal destinations are marked; ${captures} captures are outlined. Choose one or ask for a hint.`
        : `${moves.length} legal destinations are marked. Look for a move that develops toward the open files without exposing your General.`,
    };
  }
  if (moveCount === 0 && !selected) {
    return {
      title: "Start with a Soldier",
      copy: solo
        ? "You play Red. Select any S piece; green dots show every legal destination, then the coach replies as Black."
        : "Red moves first. Select any S piece; green dots show every legal destination.",
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
  name,
  turn,
  captured,
}: {
  color: "red" | "black";
  name: string;
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
        <h3>{name}</h3>
        <p>
          {turn ? (name === "Coach bot" ? "Thinking" : "Your turn") : "Waiting"}
        </p>
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
