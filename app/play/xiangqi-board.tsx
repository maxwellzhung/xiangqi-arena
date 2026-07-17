"use client";

import type { Move, Position, Square } from "@/packages/xiangqi-engine/src";
import { getPiece, isInCheck } from "@/packages/xiangqi-engine/src";

const english: Record<string, [string, string]> = {
  general: ["G", "General"],
  advisor: ["A", "Advisor"],
  elephant: ["E", "Elephant"],
  horse: ["H", "Horse"],
  rook: ["R", "Rook"],
  cannon: ["C", "Cannon"],
  soldier: ["S", "Soldier"],
};
const traditional: Record<string, [string, string]> = {
  general: ["帥", "General"],
  advisor: ["仕", "Advisor"],
  elephant: ["相", "Elephant"],
  horse: ["傌", "Horse"],
  rook: ["俥", "Rook"],
  cannon: ["炮", "Cannon"],
  soldier: ["兵", "Soldier"],
};
const blackTraditional: Record<string, string> = {
  general: "將",
  advisor: "士",
  elephant: "象",
  horse: "馬",
  rook: "車",
  cannon: "砲",
  soldier: "卒",
};

export function XiangqiBoard({
  position,
  selected,
  legalMoves = [],
  lastMove,
  styleMode = "western",
  orientation = "red",
  onSelect,
  onMove,
  disabled = false,
}: {
  position: Position;
  selected?: Square | null;
  legalMoves?: readonly Move[];
  lastMove?: Move | null;
  styleMode?: "western" | "traditional";
  orientation?: "red" | "black";
  onSelect?: (square: Square) => void;
  onMove?: (move: Move) => void;
  disabled?: boolean;
}) {
  const squares = Array.from({ length: 90 }, (_, index) => ({
    column: index % 9,
    row: Math.floor(index / 9),
  }));
  const currentInCheck = (() => {
    try {
      return isInCheck(position, position.turn);
    } catch {
      return false;
    }
  })();
  function isSame(a: Square | null | undefined, b: Square) {
    return !!a && a.column === b.column && a.row === b.row;
  }
  function destinationFor(square: Square) {
    return legalMoves.find((move) => isSame(move.to, square));
  }
  function activate(square: Square) {
    const destination = destinationFor(square);
    if (destination && onMove) onMove(destination);
    else onSelect?.(square);
  }
  return (
    <div className={`game-board-frame orientation-${orientation}`}>
      <div className="board-label board-label-top">
        {orientation === "red" ? "BLACK" : "RED"}
      </div>
      <div
        className="game-board"
        role="grid"
        aria-label={`Xiangqi board, ${position.turn} to move${currentInCheck ? ", in check" : ""}`}
      >
        <span className="game-river" aria-hidden="true">
          <i>楚河</i>
          <b>RIVER</b>
          <i>漢界</i>
        </span>
        <i className="palace palace-top" aria-hidden="true" />
        <i className="palace palace-bottom" aria-hidden="true" />
        {squares.map((square) => {
          const piece = getPiece(position, square);
          const destination = destinationFor(square);
          const selectedNow = isSame(selected, square);
          const last =
            isSame(lastMove?.from, square) || isSame(lastMove?.to, square);
          const chars =
            styleMode === "traditional"
              ? traditional[piece?.type ?? ""]
              : english[piece?.type ?? ""];
          const label = piece
            ? styleMode === "traditional" && piece.color === "black"
              ? blackTraditional[piece.type]
              : chars?.[0]
            : "";
          const name = piece ? english[piece.type][1] : "Empty";
          const file = String.fromCharCode(65 + square.column);
          const rank = 10 - square.row;
          return (
            <button
              key={`${square.column}-${square.row}`}
              type="button"
              role="gridcell"
              className={`board-point${piece ? ` occupied ${piece.color}` : ""}${selectedNow ? " selected" : ""}${destination ? " legal" : ""}${last ? " last-move" : ""}`}
              style={{
                left: `${(square.column / 8) * 100}%`,
                top: `${(square.row / 9) * 100}%`,
              }}
              aria-label={`${piece ? `${piece.color} ${name}` : "Empty intersection"}, file ${file}, rank ${rank}${selectedNow ? ", selected" : ""}${destination ? ", legal destination" : ""}`}
              aria-selected={selectedNow}
              disabled={disabled}
              draggable={!!piece && !disabled}
              onDragStart={() => onSelect?.(square)}
              onDragOver={(event) => {
                if (destination) event.preventDefault();
              }}
              onDrop={() => {
                if (destination && onMove) onMove(destination);
              }}
              onClick={() => activate(square)}
            >
              <span className="legal-dot" aria-hidden="true" />
              {piece && (
                <span className="piece-face" aria-hidden="true">
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="board-label board-label-bottom">
        {orientation === "red" ? "RED · YOU" : "BLACK · YOU"}
      </div>
    </div>
  );
}
