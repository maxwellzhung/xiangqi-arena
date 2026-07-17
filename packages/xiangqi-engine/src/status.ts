import {
  type Color,
  type GameStatus,
  type Position,
  type PositionHistoryEntry,
  type RepetitionPolicy,
} from "./types";
import { createPositionHash, deserializePosition } from "./position";
import {
  findGeneral,
  generateLegalMoves,
  isInCheck,
  oppositeColor,
} from "./moves";

export const conservativeThreefoldRepetitionPolicy: RepetitionPolicy =
  Object.freeze({
    id: "conservative-threefold-position-v1",
    evaluate(currentHash: string, previousHashes: readonly string[]) {
      const occurrences =
        1 + previousHashes.filter((hash) => hash === currentHash).length;
      return Object.freeze({ repeated: occurrences >= 3, occurrences });
    },
  });

function resultForWinner(winner: Color): "red-win" | "black-win" {
  return winner === "red" ? "red-win" : "black-win";
}

function terminalLoss(
  position: Position,
  status: "checkmate" | "stalemate",
  inCheck: boolean,
): GameStatus {
  const winner = oppositeColor(position.turn);
  return Object.freeze({
    status,
    isTerminal: true,
    turn: position.turn,
    inCheck,
    winner,
    result: resultForWinner(winner),
    terminationReason: status,
    repetitionCount: 0,
  });
}

export function normalizePositionHistory(
  history: readonly PositionHistoryEntry[],
): readonly string[] {
  return Object.freeze(
    history.map((entry) => {
      if (typeof entry !== "string") return createPositionHash(entry);
      if (/^[0-9a-f]{64}$/.test(entry)) return entry;
      return createPositionHash(deserializePosition(entry));
    }),
  );
}

/**
 * `history` contains positions before `position`; it must not include the
 * current position. A custom policy can replace the conservative MVP rule.
 */
export function getGameStatus(
  position: Position,
  history: readonly PositionHistoryEntry[] = [],
  repetitionPolicy: RepetitionPolicy = conservativeThreefoldRepetitionPolicy,
): GameStatus {
  const redGeneral = findGeneral(position, "red");
  const blackGeneral = findGeneral(position, "black");
  if (redGeneral === null && blackGeneral === null) {
    throw new Error("Cannot adjudicate a position with both generals missing");
  }
  if (findGeneral(position, position.turn) === null)
    return terminalLoss(position, "checkmate", true);

  const inCheck = isInCheck(position, position.turn);
  if (generateLegalMoves(position).length === 0) {
    return terminalLoss(position, inCheck ? "checkmate" : "stalemate", inCheck);
  }

  const evaluation = repetitionPolicy.evaluate(
    createPositionHash(position),
    normalizePositionHistory(history),
  );
  if (evaluation.repeated) {
    return Object.freeze({
      status: "repetition",
      isTerminal: true,
      turn: position.turn,
      inCheck,
      winner: null,
      result: "draw",
      terminationReason: "repetition",
      repetitionCount: evaluation.occurrences,
    });
  }

  return Object.freeze({
    status: "active",
    isTerminal: false,
    turn: position.turn,
    inCheck,
    winner: null,
    result: null,
    terminationReason: null,
    repetitionCount: evaluation.occurrences,
  });
}
