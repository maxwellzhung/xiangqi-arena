import {
  IllegalMoveError,
  applyMove,
  createInitialPosition,
  createPositionHash,
  deserializePosition,
  getGameStatus,
  getPiece,
  serializePosition,
} from "@xiangqi-arena/xiangqi-engine";
import type { RulesEngine } from "./types.js";

export const xiangqiRulesEngine: RulesEngine = {
  createInitialSerializedPosition() {
    return serializePosition(createInitialPosition());
  },

  createHash(serializedPosition) {
    return createPositionHash(deserializePosition(serializedPosition));
  },

  applyMove(serializedPosition, move, positionHistory) {
    const position = deserializePosition(serializedPosition);
    const captured = getPiece(position, move.to);
    try {
      const next = applyMove(position, move);
      // The current serialized position is the last history entry and must be
      // excluded because the engine's repetition API expects only predecessors.
      const previousPositions = positionHistory.slice(0, -1);
      const status = getGameStatus(next, previousPositions);
      return {
        accepted: true,
        serializedPosition: serializePosition(next),
        positionHash: createPositionHash(next),
        currentTurn: next.turn,
        capturedPiece: captured ? `${captured.color}-${captured.type}` : null,
        terminal:
          status.isTerminal && status.result && status.terminationReason
            ? { result: status.result, reason: status.terminationReason }
            : null,
      };
    } catch (error) {
      if (error instanceof IllegalMoveError) {
        return {
          accepted: false,
          reason: "That move is not legal in the current position.",
        };
      }
      throw error;
    }
  },
};
