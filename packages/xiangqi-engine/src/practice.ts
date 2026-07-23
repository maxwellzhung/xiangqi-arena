import { applyMove, generateLegalMoves, isInCheck, isLegalMove } from "./moves";
import { getPiece } from "./position";
import type { Color, Move, Position } from "./types";

const PIECE_VALUE: Record<string, number> = {
  general: 100_000,
  rook: 900,
  cannon: 450,
  horse: 420,
  elephant: 220,
  advisor: 220,
  soldier: 120,
};

const MATE_SCORE = 1_000_000;

export type PracticeDifficulty = "beginner" | "standard" | "expert";

function positionalValue(
  type: string,
  color: Color,
  column: number,
  row: number,
) {
  const center = 4 - Math.abs(4 - column);
  if (type === "soldier") {
    const progress = color === "red" ? 6 - row : row - 3;
    const crossedRiver = color === "red" ? row <= 4 : row >= 5;
    return Math.max(0, progress) * 10 + (crossedRiver ? 28 + center * 4 : 0);
  }
  if (type === "horse") return center * 7;
  if (type === "cannon") return center * 5;
  if (type === "rook") return center * 2;
  return 0;
}

function evaluatePosition(position: Position, perspective: Color) {
  let score = 0;
  position.board.forEach((piece, index) => {
    if (!piece) return;
    const row = Math.floor(index / 9);
    const column = index % 9;
    const value =
      (PIECE_VALUE[piece.type] ?? 0) +
      positionalValue(piece.type, piece.color, column, row);
    score += piece.color === perspective ? value : -value;
  });

  try {
    if (isInCheck(position, position.turn)) {
      score += position.turn === perspective ? -110 : 110;
    }
  } catch {
    /* Invalid teaching positions are evaluated from material alone. */
  }
  return score;
}

function moveOrderScore(position: Position, move: Move, moveCount: number) {
  const captured = getPiece(position, move.to);
  const mover = getPiece(position, move.from);
  let score = captured ? (PIECE_VALUE[captured.type] ?? 0) * 12 : 0;
  if (mover?.type === "soldier") score += 45;
  if (mover && ["horse", "rook", "cannon"].includes(mover.type)) score += 30;
  score += (4 - Math.abs(4 - move.to.column)) * 6;
  score += ((move.to.row * 9 + move.to.column + moveCount * 7) % 17) / 100;
  return score;
}

function orderedMoves(
  position: Position,
  moves: readonly Move[],
  moveCount: number,
) {
  return moves
    .map((move) => ({
      move,
      score: moveOrderScore(position, move, moveCount),
    }))
    .sort((first, second) => second.score - first.score);
}

function search(
  position: Position,
  depth: number,
  perspective: Color,
  moveCount: number,
  branchLimit: number,
  alpha: number,
  beta: number,
): number {
  if (depth === 0) {
    try {
      if (
        isInCheck(position, position.turn) &&
        generateLegalMoves(position).length === 0
      ) {
        return position.turn === perspective ? -MATE_SCORE : MATE_SCORE;
      }
    } catch {
      /* Invalid teaching positions are evaluated from material alone. */
    }
    return evaluatePosition(position, perspective);
  }

  const moves = generateLegalMoves(position);
  if (!moves.length) {
    return position.turn === perspective
      ? -MATE_SCORE - depth
      : MATE_SCORE + depth;
  }

  const maximizing = position.turn === perspective;
  let best = maximizing ? -Infinity : Infinity;
  const candidates = orderedMoves(position, moves, moveCount).slice(
    0,
    branchLimit,
  );
  for (const { move } of candidates) {
    const value = search(
      applyMove(position, move),
      depth - 1,
      perspective,
      moveCount + 1,
      branchLimit,
      alpha,
      beta,
    );
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

/**
 * Deterministic move choice for the browser-based teaching opponent.
 * Beginner varies among plausible moves, Standard anticipates the opponent's
 * next reply, and Expert searches one full move deeper with alpha-beta pruning.
 */
export function choosePracticeMove(
  position: Position,
  moveCount = 0,
  difficulty: PracticeDifficulty = "standard",
): Move | null {
  const moves = generateLegalMoves(position);
  if (!moves.length) return null;
  const ranked = orderedMoves(position, moves, moveCount);

  if (difficulty === "beginner") {
    const poolSize = Math.min(7, ranked.length);
    const choiceIndex =
      poolSize === 1 ? 0 : 1 + ((moveCount * 3) % (poolSize - 1));
    const choice = ranked[choiceIndex].move;
    return isLegalMove(position, choice) ? choice : null;
  }

  const perspective = position.turn;
  const depth = difficulty === "expert" ? 2 : 1;
  const branchLimit = difficulty === "expert" ? 14 : 18;
  const rootLimit = difficulty === "expert" ? 20 : 24;
  const searched = ranked.slice(0, rootLimit).map(({ move, score }) => ({
    move,
    score:
      search(
        applyMove(position, move),
        depth,
        perspective,
        moveCount + 1,
        branchLimit,
        -Infinity,
        Infinity,
      ) +
      score / 100_000,
  }));
  searched.sort((first, second) => second.score - first.score);
  const choice = searched[0].move;
  return isLegalMove(position, choice) ? choice : null;
}
