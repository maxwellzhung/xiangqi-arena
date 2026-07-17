export const BOARD_COLUMNS = 9;
export const BOARD_ROWS = 10;
export const BOARD_SIZE = BOARD_COLUMNS * BOARD_ROWS;

export const COLORS = ["red", "black"] as const;
export type Color = (typeof COLORS)[number];

export const PIECE_TYPES = [
  "general",
  "advisor",
  "elephant",
  "horse",
  "rook",
  "cannon",
  "soldier",
] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export interface Square {
  readonly column: number;
  readonly row: number;
}

export interface Move {
  readonly from: Square;
  readonly to: Square;
}

export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
}

/** A flat, row-major board. Index = row * 9 + column. */
export interface Position {
  readonly board: ReadonlyArray<Piece | null>;
  readonly turn: Color;
}

export interface PlacedPiece extends Piece, Square {}

export interface PositionValidationOptions {
  /** Require exactly one general of each color. Defaults to true. */
  readonly requireBothGenerals?: boolean;
}

export interface PositionValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export type NotationStyle = "ucci" | "coordinate" | "western";

export type EngineGameResult = "red-win" | "black-win" | "draw";
export type EngineTerminationReason = "checkmate" | "stalemate" | "repetition";
export type EngineStatusKind = "active" | EngineTerminationReason;

export interface GameStatus {
  readonly status: EngineStatusKind;
  readonly isTerminal: boolean;
  readonly turn: Color;
  readonly inCheck: boolean;
  readonly winner: Color | null;
  readonly result: EngineGameResult | null;
  readonly terminationReason: EngineTerminationReason | null;
  readonly repetitionCount: number;
}

export type PositionHistoryEntry = Position | string;

export interface RepetitionEvaluation {
  readonly repeated: boolean;
  readonly occurrences: number;
}

export interface RepetitionPolicy {
  readonly id: string;
  evaluate(
    currentHash: string,
    previousHashes: readonly string[],
  ): RepetitionEvaluation;
}
