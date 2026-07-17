"use client";

import { useId, useRef, useState } from "react";
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

export function squareName(square: Square) {
  return `${String.fromCharCode(97 + square.column)}${9 - square.row}`;
}

export function XiangqiBoard({
  position,
  selected,
  legalMoves = [],
  lastMove,
  styleMode = "western",
  orientation = "red",
  onSelect,
  onMove,
  onReject,
  hintSquares = [],
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
  onReject?: (from: Square | null, to: Square) => void;
  hintSquares?: readonly Square[];
  disabled?: boolean;
}) {
  const instructionsId = useId();
  const afterBoardId = useId();
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const defaultFocusIndex = position.turn === "red" ? 85 : 4;
  const [focusIndex, setFocusIndex] = useState(defaultFocusIndex);
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
    if (disabled) return;
    const destination = destinationFor(square);
    if (destination && onMove) onMove(destination);
    else {
      const piece = getPiece(position, square);
      if (
        selected &&
        (!piece || piece.color !== position.turn) &&
        !isSame(selected, square)
      ) {
        onReject?.(selected, square);
        return;
      }
      if (!selected && piece && piece.color !== position.turn) {
        onReject?.(null, square);
        return;
      }
      onSelect?.(square);
    }
  }
  function moveFocus(index: number, event: React.KeyboardEvent) {
    const square = squares[index];
    const visualDirection = orientation === "red" ? 1 : -1;
    let nextColumn = square.column;
    let nextRow = square.row;
    if (event.key === "ArrowLeft") nextColumn -= visualDirection;
    else if (event.key === "ArrowRight") nextColumn += visualDirection;
    else if (event.key === "ArrowUp") nextRow -= visualDirection;
    else if (event.key === "ArrowDown") nextRow += visualDirection;
    else if (event.key === "Home") nextColumn = orientation === "red" ? 0 : 8;
    else if (event.key === "End") nextColumn = orientation === "red" ? 8 : 0;
    else return;
    event.preventDefault();
    if (nextColumn < 0 || nextColumn > 8 || nextRow < 0 || nextRow > 9) return;
    const nextIndex = nextRow * 9 + nextColumn;
    setFocusIndex(nextIndex);
    cellRefs.current[nextIndex]?.focus();
  }
  const fileLabels = Array.from({ length: 9 }, (_, index) =>
    String.fromCharCode(97 + (orientation === "red" ? index : 8 - index)),
  );
  const rankLabels = Array.from({ length: 10 }, (_, index) =>
    orientation === "red" ? 9 - index : index,
  );
  const occupiedCount = squares.filter((square) =>
    getPiece(position, square),
  ).length;
  return (
    <div
      className={`game-board-frame orientation-${orientation} piece-mode-${styleMode}`}
    >
      <div className="board-label board-label-top">
        {orientation === "red" ? "BLACK" : "RED"}
      </div>
      <p className="sr-only" id={instructionsId}>
        Use the arrow keys to move between intersections. Press Enter or Space
        to select a piece, then choose a highlighted legal destination. The
        board contains {occupiedCount} pieces and {legalMoves.length} marked
        legal destinations.
      </p>
      <a className="skip-board-link" href={`#${afterBoardId}`}>
        Skip the 90-intersection board
      </a>
      <div className="game-board-area">
        <div className="board-files" aria-hidden="true">
          {fileLabels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className="board-ranks" aria-hidden="true">
          {rankLabels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div
          className="game-board"
          role="grid"
          aria-rowcount={10}
          aria-colcount={9}
          aria-describedby={instructionsId}
          aria-label={`Xiangqi board, ${position.turn} to move${currentInCheck ? ", in check" : ""}`}
        >
          <span className="game-river" aria-hidden="true">
            <i>楚河</i>
            <b>RIVER</b>
            <i>漢界</i>
          </span>
          <i className="palace palace-top" aria-hidden="true" />
          <i className="palace palace-bottom" aria-hidden="true" />
          {squares.map((square, index) => {
            const piece = getPiece(position, square);
            const destination = destinationFor(square);
            const selectedNow = isSame(selected, square);
            const hinted = hintSquares.some((hint) => isSame(hint, square));
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
            const coordinate = squareName(square);
            return (
              <button
                key={`${square.column}-${square.row}`}
                ref={(node) => {
                  cellRefs.current[index] = node;
                }}
                type="button"
                role="gridcell"
                aria-rowindex={
                  orientation === "red" ? square.row + 1 : 10 - square.row
                }
                aria-colindex={
                  orientation === "red" ? square.column + 1 : 9 - square.column
                }
                aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Space"
                className={`board-point${piece ? ` occupied ${piece.color}` : ""}${selectedNow ? " selected" : ""}${destination ? " legal" : ""}${last ? " last-move" : ""}${hinted ? " hinted" : ""}`}
                style={{
                  left: `${(square.column / 8) * 100}%`,
                  top: `${(square.row / 9) * 100}%`,
                }}
                aria-label={`${piece ? `${piece.color} ${name}` : "Empty intersection"}, coordinate ${coordinate}${selectedNow ? ", selected" : ""}${destination ? ", legal destination" : ""}${hinted ? ", hint" : ""}`}
                aria-selected={selectedNow}
                aria-disabled={disabled}
                disabled={disabled}
                tabIndex={index === focusIndex ? 0 : -1}
                draggable={!!piece && !disabled}
                onFocus={() => setFocusIndex(index)}
                onKeyDown={(event) => moveFocus(index, event)}
                onDragStart={() => {
                  if (!disabled) onSelect?.(square);
                }}
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
      </div>
      <span className="sr-only" id={afterBoardId} tabIndex={-1}>
        End of Xiangqi board.
      </span>
      <div className="board-label board-label-bottom">
        {orientation === "red" ? "RED · YOU" : "BLACK · YOU"}
      </div>
    </div>
  );
}
