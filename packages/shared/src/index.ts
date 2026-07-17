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

export const publicPlayerSchema = z
  .object({
    id: z.string().min(1),
    displayName: z.string().min(1).max(64),
    kind: z.enum(["user", "guest"]),
    rating: z.number().int(),
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

export const authoritativeClockSchema = z
  .object({
    redMs: z.number().int().nonnegative(),
    blackMs: z.number().int().nonnegative(),
    running: z.enum(colors).nullable(),
    measuredAt: z.number().int().nonnegative(),
  })
  .strict();

export const publicMoveSchema = z
  .object({
    sequence: z.number().int().positive(),
    color: z.enum(colors),
    move: moveSchema,
    capturedPiece: z.enum(pieceTypes).nullable(),
  })
  .strict();

export const gameSnapshotSchema = z
  .object({
    gameId: z.string().min(8),
    version: z.number().int().nonnegative(),
    moveSequence: z.number().int().nonnegative(),
    currentTurn: z.enum(colors),
    serializedPosition: z.string().min(1),
    clock: authoritativeClockSchema,
    status: z.enum(["waiting", "active", "completed"]),
    result: z.enum(["red-win", "black-win", "draw"]).nullable(),
    terminationReason: z
      .enum([
        "checkmate",
        "stalemate",
        "resignation",
        "timeout",
        "draw-agreement",
        "repetition",
      ])
      .nullable(),
    timeControlId: z.enum(timeControlIds),
    rated: z.boolean(),
    redPlayer: publicPlayerSchema,
    blackPlayer: publicPlayerSchema,
    drawOfferedBy: z.enum(colors).nullable(),
    rematchRequestedBy: z.enum(colors).nullable(),
    moves: z.array(publicMoveSchema),
  })
  .strict();

export const serverEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("roomCreated"),
      roomCode: z.string().regex(/^[A-Z2-9]{6}$/),
      joinUrl: z.string().url(),
    })
    .strict(),
  z
    .object({
      type: z.literal("roomJoined"),
      gameId: z.string().min(8),
      color: z.enum(colors),
    })
    .strict(),
  z
    .object({
      type: z.literal("matchFound"),
      gameId: z.string().min(8),
      color: z.enum(colors),
    })
    .strict(),
  z
    .object({ type: z.literal("stateSnapshot"), snapshot: gameSnapshotSchema })
    .strict(),
  z
    .object({
      type: z.literal("moveAccepted"),
      commandId: z.string().uuid(),
      snapshot: gameSnapshotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("moveRejected"),
      commandId: z.string().uuid(),
      reason: z.string().min(1),
      snapshot: gameSnapshotSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("clockSync"),
      gameId: z.string().min(8),
      clock: authoritativeClockSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("drawOffered"),
      gameId: z.string().min(8),
      snapshot: gameSnapshotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("drawOfferCancelled"),
      gameId: z.string().min(8),
      snapshot: gameSnapshotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("rematchRequested"),
      gameId: z.string().min(8),
      snapshot: gameSnapshotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("opponentDisconnected"),
      gameId: z.string().min(8),
      graceEndsAt: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      type: z.literal("opponentReconnected"),
      gameId: z.string().min(8),
    })
    .strict(),
  z
    .object({ type: z.literal("gameEnded"), snapshot: gameSnapshotSchema })
    .strict(),
  z
    .object({
      type: z.literal("protocolError"),
      code: z.string().min(1),
      message: z.string().min(1),
    })
    .strict(),
]);

export type PublicPlayer = z.infer<typeof publicPlayerSchema>;
export type AuthoritativeClock = z.infer<typeof authoritativeClockSchema>;
export type PublicMove = z.infer<typeof publicMoveSchema>;
export type GameSnapshot = z.infer<typeof gameSnapshotSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
