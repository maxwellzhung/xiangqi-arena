import type {
  AuthoritativeClock,
  Color,
  GameResult,
  GameSnapshot,
  TerminationReason,
  TimeControlId,
} from "@xiangqi-arena/shared";
import { moveSchema } from "@xiangqi-arena/shared";
import type { z } from "zod";

export type Move = z.infer<typeof moveSchema>;

export type PlayerKind = "user" | "guest";

export interface PlayerIdentity {
  id: string;
  kind: PlayerKind;
  displayName: string;
  rating: number;
}

export interface TimeSource {
  monotonicMs(): number;
  wallTimeMs(): number;
}

export const systemTime: TimeSource = {
  monotonicMs: () => performance.now(),
  wallTimeMs: () => Date.now(),
};

export interface ClockRecord {
  redMs: number;
  blackMs: number;
  running: Color | null;
  lastStartedMonotonicMs: number;
  incrementMs: number;
}

export interface StoredMove {
  id: string;
  sequence: number;
  color: Color;
  move: Move;
  capturedPiece: string | null;
  positionAfter: string;
  positionHash: string;
  clock: AuthoritativeClock;
  createdAt: number;
}

export interface StoredGame {
  id: string;
  roomType: "private" | "matchmaking" | "rematch";
  rated: boolean;
  timeControlId: TimeControlId;
  redPlayer: PlayerIdentity;
  blackPlayer: PlayerIdentity;
  initialPosition: string;
  serializedPosition: string;
  positionHash: string;
  positionHistory: string[];
  version: number;
  moveSequence: number;
  currentTurn: Color;
  clock: ClockRecord;
  status: "waiting" | "active" | "completed";
  result: GameResult | null;
  terminationReason: TerminationReason | null;
  moves: StoredMove[];
  drawOfferedBy: Color | null;
  rematchRequestedBy: Color | null;
  completionToken: string | null;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

export interface EngineMoveAccepted {
  accepted: true;
  serializedPosition: string;
  positionHash: string;
  currentTurn: Color;
  capturedPiece: string | null;
  terminal: null | {
    result: GameResult;
    reason: TerminationReason;
  };
}

export interface EngineMoveRejected {
  accepted: false;
  reason: string;
}

export interface RulesEngine {
  createInitialSerializedPosition(): string;
  createHash(serializedPosition: string): string;
  applyMove(
    serializedPosition: string,
    move: Move,
    positionHistory: readonly string[],
  ): EngineMoveAccepted | EngineMoveRejected;
}

export interface MatchCreated {
  game: StoredGame;
  colors: Record<string, Color>;
}

export interface SnapshotFactory {
  snapshot(game: StoredGame): GameSnapshot;
}
