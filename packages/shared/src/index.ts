import { z } from "zod";

export const colors = ["red", "black"] as const;
export const pieceTypes = [
  "general",
  "advisor",
  "elephant",
  "horse",
  "rook",
  "cannon",
  "soldier",
] as const;
export const timeControlIds = ["blitz-5", "rapid-10", "classic-15-10"] as const;

export type Color = (typeof colors)[number];
export type PieceType = (typeof pieceTypes)[number];
export type TimeControlId = (typeof timeControlIds)[number];

export const squareSchema = z
  .object({
    column: z.number().int().min(0).max(8),
    row: z.number().int().min(0).max(9),
  })
  .strict();

export const moveSchema = z
  .object({ from: squareSchema, to: squareSchema })
  .strict();

export const timeControlSchema = z
  .object({
    initialMs: z.number().int().positive(),
    incrementMs: z.number().int().nonnegative(),
  })
  .strict();

const commandBase = z.object({ commandId: z.string().uuid() }).strict();
const gameCommandBase = z
  .object({
    commandId: z.string().uuid(),
    gameId: z.string().min(8),
    expectedVersion: z.number().int().nonnegative(),
  })
  .strict();

export const clientCommandSchema = z.discriminatedUnion("type", [
  commandBase.extend({
    type: z.literal("createPrivateRoom"),
    timeControlId: z.enum(timeControlIds),
    rated: z.literal(false),
  }),
  commandBase.extend({
    type: z.literal("joinPrivateRoom"),
    roomCode: z.string().regex(/^[A-Z2-9]{6}$/),
  }),
  commandBase.extend({
    type: z.literal("joinMatchmaking"),
    timeControlId: z.enum(timeControlIds),
    rated: z.boolean(),
  }),
  commandBase.extend({ type: z.literal("leaveMatchmaking") }),
  gameCommandBase.extend({ type: z.literal("submitMove"), move: moveSchema }),
  gameCommandBase.extend({ type: z.literal("resign") }),
  gameCommandBase.extend({ type: z.literal("offerDraw") }),
  gameCommandBase.extend({
    type: z.literal("respondToDraw"),
    accept: z.boolean(),
  }),
  gameCommandBase.extend({ type: z.literal("requestRematch") }),
  gameCommandBase.extend({
    type: z.literal("respondToRematch"),
    accept: z.boolean(),
  }),
  gameCommandBase.extend({ type: z.literal("requestStateSync") }),
  commandBase.extend({
    type: z.literal("heartbeat"),
    sentAt: z.number().int().nonnegative(),
  }),
]);

export type ClientCommand = z.infer<typeof clientCommandSchema>;

export type GameResult = "red-win" | "black-win" | "draw";
export type TerminationReason =
  | "checkmate"
  | "stalemate"
  | "resignation"
  | "timeout"
  | "draw-agreement"
  | "repetition";

export interface AuthoritativeClock {
  redMs: number;
  blackMs: number;
  running: Color | null;
  measuredAt: number;
}

export interface GameSnapshot {
  gameId: string;
  version: number;
  moveSequence: number;
  currentTurn: Color;
  serializedPosition: string;
  clock: AuthoritativeClock;
  status: "waiting" | "active" | "completed";
  result: GameResult | null;
  terminationReason: TerminationReason | null;
}

export type ServerEvent =
  | { type: "roomCreated"; roomCode: string; joinUrl: string }
  | { type: "roomJoined"; gameId: string; color: Color }
  | { type: "matchFound"; gameId: string; color: Color }
  | { type: "stateSnapshot"; snapshot: GameSnapshot }
  | { type: "moveAccepted"; commandId: string; snapshot: GameSnapshot }
  | {
      type: "moveRejected";
      commandId: string;
      reason: string;
      snapshot?: GameSnapshot;
    }
  | { type: "clockSync"; gameId: string; clock: AuthoritativeClock }
  | {
      type: "drawOffered" | "drawOfferCancelled" | "rematchRequested";
      gameId: string;
    }
  | { type: "opponentDisconnected"; gameId: string; graceEndsAt: number }
  | { type: "opponentReconnected"; gameId: string }
  | { type: "gameEnded"; snapshot: GameSnapshot }
  | { type: "protocolError"; code: string; message: string };
