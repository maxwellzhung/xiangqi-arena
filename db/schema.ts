import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () =>
  text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

/**
 * Player is the stable identity used by games. Accounts and guests are
 * deliberately separate one-to-one profiles so a guest can later be linked to
 * an account without changing references on an active game.
 */
export const players = sqliteTable(
  "players",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["user", "guest"] }).notNull(),
    status: text("status", { enum: ["active", "suspended", "deleted"] })
      .notNull()
      .default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("players_kind_check", sql`${table.kind} IN ('user', 'guest')`),
    check(
      "players_status_check",
      sql`${table.status} IN ('active', 'suspended', 'deleted')`,
    ),
    index("players_status_idx").on(table.status),
  ],
);

export const users = sqliteTable(
  "users",
  {
    playerId: text("player_id")
      .primaryKey()
      .references(() => players.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    email: text("email"),
    externalAccountRef: text("external_account_ref"),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    accountStatus: text("account_status", {
      enum: ["active", "suspended", "pending-deletion"],
    })
      .notNull()
      .default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_external_account_ref_unique").on(
      table.externalAccountRef,
    ),
    uniqueIndex("users_username_unique").on(table.username),
    index("users_display_name_idx").on(table.displayName),
    check(
      "users_account_status_check",
      sql`${table.accountStatus} IN ('active', 'suspended', 'pending-deletion')`,
    ),
    check(
      "users_login_identifier_check",
      sql`${table.email} IS NOT NULL OR ${table.externalAccountRef} IS NOT NULL`,
    ),
  ],
);

export const guestIdentities = sqliteTable(
  "guest_identities",
  {
    playerId: text("player_id")
      .primaryKey()
      .references(() => players.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    /** SHA-256 (or stronger) digest of the signed browser token, never the token itself. */
    signedTokenRef: text("signed_token_ref").notNull(),
    createdAt: createdAt(),
    lastActiveAt: text("last_active_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("guest_identities_token_ref_unique").on(table.signedTokenRef),
  ],
);

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    roomType: text("room_type", {
      enum: ["private", "matchmaking", "rematch"],
    }).notNull(),
    rated: integer("rated", { mode: "boolean" }).notNull().default(false),
    timeControlId: text("time_control_id", {
      enum: ["blitz-5", "rapid-10", "classic-15-10"],
    }).notNull(),
    initialMs: integer("initial_ms").notNull(),
    incrementMs: integer("increment_ms").notNull().default(0),
    redPlayerId: text("red_player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    blackPlayerId: text("black_player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    initialPosition: text("initial_position").notNull(),
    currentPosition: text("current_position").notNull(),
    positionHash: text("position_hash").notNull(),
    version: integer("version").notNull().default(0),
    moveSequence: integer("move_sequence").notNull().default(0),
    currentTurn: text("current_turn", { enum: ["red", "black"] })
      .notNull()
      .default("red"),
    redTimeMs: integer("red_time_ms").notNull(),
    blackTimeMs: integer("black_time_ms").notNull(),
    clockRunning: text("clock_running", { enum: ["red", "black"] }),
    clockMeasuredAt: integer("clock_measured_at").notNull(),
    status: text("status", {
      enum: ["waiting", "active", "completed", "cancelled"],
    })
      .notNull()
      .default("waiting"),
    result: text("result", { enum: ["red-win", "black-win", "draw"] }),
    terminationReason: text("termination_reason", {
      enum: [
        "checkmate",
        "stalemate",
        "resignation",
        "timeout",
        "draw-agreement",
        "repetition",
      ],
    }),
    /** Set once inside the completion transaction. */
    completionToken: text("completion_token"),
    createdAt: createdAt(),
    startedAt: text("started_at"),
    endedAt: text("ended_at"),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("games_completion_token_unique").on(table.completionToken),
    index("games_status_created_idx").on(table.status, table.createdAt),
    index("games_red_player_created_idx").on(
      table.redPlayerId,
      table.createdAt,
    ),
    index("games_black_player_created_idx").on(
      table.blackPlayerId,
      table.createdAt,
    ),
    index("games_rated_status_idx").on(table.rated, table.status),
    check(
      "games_players_distinct_check",
      sql`${table.redPlayerId} <> ${table.blackPlayerId}`,
    ),
    check("games_initial_ms_check", sql`${table.initialMs} > 0`),
    check("games_increment_ms_check", sql`${table.incrementMs} >= 0`),
    check("games_version_check", sql`${table.version} >= 0`),
    check("games_move_sequence_check", sql`${table.moveSequence} >= 0`),
    check("games_red_time_check", sql`${table.redTimeMs} >= 0`),
    check("games_black_time_check", sql`${table.blackTimeMs} >= 0`),
    check("games_turn_check", sql`${table.currentTurn} IN ('red', 'black')`),
    check(
      "games_completion_shape_check",
      sql`(${table.status} = 'completed' AND ${table.result} IS NOT NULL AND ${table.terminationReason} IS NOT NULL AND ${table.endedAt} IS NOT NULL) OR (${table.status} <> 'completed' AND ${table.result} IS NULL AND ${table.terminationReason} IS NULL)`,
    ),
  ],
);

/**
 * Inserted exactly once in the same transaction that marks a game completed.
 * The game-id primary key is the database-level guard against repeated result
 * processing, while the token is safe to reuse as an external idempotency key.
 */
export const gameCompletions = sqliteTable(
  "game_completions",
  {
    gameId: text("game_id")
      .primaryKey()
      .references(() => games.id, { onDelete: "cascade", onUpdate: "cascade" }),
    completionToken: text("completion_token").notNull(),
    result: text("result", {
      enum: ["red-win", "black-win", "draw"],
    }).notNull(),
    terminationReason: text("termination_reason", {
      enum: [
        "checkmate",
        "stalemate",
        "resignation",
        "timeout",
        "draw-agreement",
        "repetition",
      ],
    }).notNull(),
    completedAt: text("completed_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    ratingsProcessedAt: text("ratings_processed_at"),
  },
  (table) => [
    uniqueIndex("game_completions_token_unique").on(table.completionToken),
    index("game_completions_completed_idx").on(table.completedAt),
  ],
);

export const moves = sqliteTable(
  "moves",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade", onUpdate: "cascade" }),
    sequence: integer("sequence").notNull(),
    movingColor: text("moving_color", { enum: ["red", "black"] }).notNull(),
    fromColumn: integer("from_column").notNull(),
    fromRow: integer("from_row").notNull(),
    toColumn: integer("to_column").notNull(),
    toRow: integer("to_row").notNull(),
    capturedPiece: text("captured_piece"),
    positionAfter: text("position_after").notNull(),
    positionHash: text("position_hash").notNull(),
    redTimeMs: integer("red_time_ms").notNull(),
    blackTimeMs: integer("black_time_ms").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("moves_game_sequence_unique").on(table.gameId, table.sequence),
    index("moves_game_created_idx").on(table.gameId, table.createdAt),
    check("moves_sequence_check", sql`${table.sequence} > 0`),
    check("moves_from_column_check", sql`${table.fromColumn} BETWEEN 0 AND 8`),
    check("moves_to_column_check", sql`${table.toColumn} BETWEEN 0 AND 8`),
    check("moves_from_row_check", sql`${table.fromRow} BETWEEN 0 AND 9`),
    check("moves_to_row_check", sql`${table.toRow} BETWEEN 0 AND 9`),
    check("moves_red_time_check", sql`${table.redTimeMs} >= 0`),
    check("moves_black_time_check", sql`${table.blackTimeMs} >= 0`),
  ],
);

export const playerRatings = sqliteTable(
  "player_ratings",
  {
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    gameMode: text("game_mode").notNull(),
    rating: integer("rating").notNull().default(1200),
    gamesPlayed: integer("games_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.playerId, table.gameMode],
      name: "player_ratings_pk",
    }),
    index("player_ratings_leaderboard_idx").on(table.gameMode, table.rating),
    check("player_ratings_rating_check", sql`${table.rating} >= 0`),
    check(
      "player_ratings_totals_check",
      sql`${table.gamesPlayed} >= 0 AND ${table.wins} >= 0 AND ${table.losses} >= 0 AND ${table.draws} >= 0 AND ${table.gamesPlayed} = ${table.wins} + ${table.losses} + ${table.draws}`,
    ),
  ],
);

export const ratingHistory = sqliteTable(
  "rating_history",
  {
    id: text("id").primaryKey(),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    gameMode: text("game_mode").notNull(),
    previousRating: integer("previous_rating").notNull(),
    newRating: integer("new_rating").notNull(),
    ratingChange: integer("rating_change").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("rating_history_player_game_mode_unique").on(
      table.playerId,
      table.gameId,
      table.gameMode,
    ),
    index("rating_history_game_idx").on(table.gameId),
    check(
      "rating_history_change_check",
      sql`${table.newRating} = ${table.previousRating} + ${table.ratingChange}`,
    ),
  ],
);

export const commandDeduplication = sqliteTable(
  "command_deduplication",
  {
    commandId: text("command_id").primaryKey(),
    gameId: text("game_id").references(() => games.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    commandType: text("command_type").notNull(),
    storedResponse: text("stored_response").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("command_deduplication_game_idx").on(table.gameId),
    index("command_deduplication_created_idx").on(table.createdAt),
  ],
);

export const privateRooms = sqliteTable(
  "private_rooms",
  {
    code: text("code").primaryKey(),
    ownerPlayerId: text("owner_player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    gameId: text("game_id").references(() => games.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    timeControlId: text("time_control_id", {
      enum: ["blitz-5", "rapid-10", "classic-15-10"],
    }).notNull(),
    status: text("status", {
      enum: ["waiting", "joined", "expired", "cancelled"],
    })
      .notNull()
      .default("waiting"),
    expiresAt: integer("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("private_rooms_game_unique").on(table.gameId),
    index("private_rooms_owner_status_idx").on(
      table.ownerPlayerId,
      table.status,
    ),
    index("private_rooms_expiry_idx").on(table.status, table.expiresAt),
    check("private_rooms_code_check", sql`length(${table.code}) = 6`),
  ],
);

export const matchmakingEntries = sqliteTable(
  "matchmaking_entries",
  {
    id: text("id").primaryKey(),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    timeControlId: text("time_control_id", {
      enum: ["blitz-5", "rapid-10", "classic-15-10"],
    }).notNull(),
    rated: integer("rated", { mode: "boolean" }).notNull().default(false),
    rating: integer("rating").notNull().default(1200),
    status: text("status", {
      enum: ["waiting", "matched", "cancelled", "expired"],
    })
      .notNull()
      .default("waiting"),
    joinedAt: integer("joined_at").notNull(),
    lastHeartbeatAt: integer("last_heartbeat_at").notNull(),
    matchedGameId: text("matched_game_id").references(() => games.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    index("matchmaking_queue_idx").on(
      table.status,
      table.timeControlId,
      table.rated,
      table.joinedAt,
    ),
    index("matchmaking_player_status_idx").on(table.playerId, table.status),
    check("matchmaking_rating_check", sql`${table.rating} >= 0`),
  ],
);

export const gameConnections = sqliteTable(
  "game_connections",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade", onUpdate: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    reconnectTokenHash: text("reconnect_token_hash").notNull(),
    connected: integer("connected", { mode: "boolean" })
      .notNull()
      .default(false),
    lastSeenAt: integer("last_seen_at").notNull(),
    graceEndsAt: integer("grace_ends_at"),
  },
  (table) => [
    primaryKey({
      columns: [table.gameId, table.playerId],
      name: "game_connections_pk",
    }),
    uniqueIndex("game_connections_token_unique").on(table.reconnectTokenHash),
    index("game_connections_grace_idx").on(table.connected, table.graceEndsAt),
  ],
);
