import { applyMove, generateLegalMoves, isInCheck, isLegalMove } from "./moves";
import { getPiece } from "./position";
import type { Move, Position } from "./types";

const PIECE_VALUE: Record<string, number> = {
  general: 10_000,
  rook: 500,
  cannon: 330,
  horse: 300,
  elephant: 170,
  advisor: 170,
  soldier: 100,
};

/**
 * Deterministic, lightweight move choice for an untimed teaching opponent.
 * It favors captures, checks, development, and central files without claiming
 * to be a competitive engine.
 */
export function choosePracticeMove(
  position: Position,
  moveCount = 0,
): Move | null {
  const moves = generateLegalMoves(position);
  if (!moves.length) return null;
  const ranked = moves.map((move, index) => {
    const captured = getPiece(position, move.to);
    const mover = getPiece(position, move.from);
    const next = applyMove(position, move);
    let score = captured ? (PIECE_VALUE[captured.type] ?? 0) : 0;
    if (isInCheck(next, next.turn)) score += 420;
    if (mover?.type === "soldier") score += 24;
    if (mover && ["horse", "rook", "cannon"].includes(mover.type)) score += 18;
    score += 8 - Math.abs(4 - move.to.column);
    score += ((index + moveCount * 7) % 11) / 100;
    return { move, score };
  });
  ranked.sort((first, second) => second.score - first.score);
  const choice = ranked[0].move;
  return isLegalMove(position, choice) ? choice : null;
}
