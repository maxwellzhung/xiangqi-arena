import { env } from "cloudflare:workers";
import {
  clientCommandSchema,
  type AuthoritativeClock,
  type ClientCommand,
  type Color,
  type GameSnapshot,
  type PublicMove,
  type PublicPlayer,
  type ServerEvent,
  type TimeControlId,
} from "@/packages/shared/src";
import {
  applyMove,
  createInitialPosition,
  createPositionHash,
  deserializePosition,
  explainMove,
  getGameStatus,
  getPiece,
  serializePosition,
} from "@/packages/xiangqi-engine/src";

const COOKIE_NAME = "xa_guest";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EVENT_STREAM_WINDOW_MS = 20_000;
const EVENT_POLL_MS = 750;
const RECONNECT_GRACE_MS = 30_000;

const TIME_CONTROLS: Record<
  TimeControlId,
  { initialMs: number; incrementMs: number }
> = {
  "blitz-5": { initialMs: 5 * 60_000, incrementMs: 0 },
  "rapid-10": { initialMs: 10 * 60_000, incrementMs: 0 },
  "classic-15-10": { initialMs: 15 * 60_000, incrementMs: 10_000 },
};

type D1 = D1Database;

type GameRow = {
  id: string;
  room_type: "private" | "matchmaking" | "rematch";
  rated: number;
  time_control_id: TimeControlId;
  initial_ms: number;
  increment_ms: number;
  red_player_id: string;
  black_player_id: string;
  initial_position: string;
  current_position: string;
  position_hash: string;
  version: number;
  move_sequence: number;
  current_turn: Color;
  red_time_ms: number;
  black_time_ms: number;
  clock_running: Color | null;
  clock_measured_at: number;
  status: "waiting" | "active" | "completed" | "cancelled";
  result: "red-win" | "black-win" | "draw" | null;
  termination_reason:
    | "checkmate"
    | "stalemate"
    | "resignation"
    | "timeout"
    | "draw-agreement"
    | "repetition"
    | null;
  draw_offered_by: Color | null;
  rematch_requested_by: Color | null;
};

type Guest = {
  id: string;
  kind: "guest";
  displayName: string;
  rating: number;
};

export class DurableGameError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DurableGameError";
  }
}

function db(): D1 {
  if (!env.DB) {
    throw new DurableGameError(
      503,
      "DATABASE_UNAVAILABLE",
      "The authoritative game database is unavailable.",
    );
  }
  return env.DB;
}

let schemaReady: Promise<void> | null = null;

/**
 * Sites applies checked-in migrations on deploy. The idempotent bootstrap is
 * retained for local previews and protects a newly provisioned D1 binding.
 */
async function ensureDurableSchema(database = db()): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS durable_guest_profiles (
        player_id TEXT PRIMARY KEY NOT NULL REFERENCES guest_identities(player_id) ON UPDATE CASCADE ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS durable_game_negotiations (
        game_id TEXT PRIMARY KEY NOT NULL REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
        draw_offered_by TEXT,
        rematch_requested_by TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT durable_game_negotiations_draw_check CHECK(draw_offered_by IS NULL OR draw_offered_by IN ('red','black')),
        CONSTRAINT durable_game_negotiations_rematch_check CHECK(rematch_requested_by IS NULL OR rematch_requested_by IN ('red','black'))
      )`,
      `CREATE TABLE IF NOT EXISTS durable_game_command_guards (
        command_id TEXT PRIMARY KEY NOT NULL REFERENCES command_deduplication(command_id) ON UPDATE CASCADE ON DELETE CASCADE,
        game_id TEXT NOT NULL REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
        expected_version INTEGER NOT NULL CHECK(expected_version >= 0),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      "CREATE INDEX IF NOT EXISTS durable_game_command_guards_game_idx ON durable_game_command_guards(game_id)",
      `CREATE TABLE IF NOT EXISTS durable_room_claims (
        room_code TEXT PRIMARY KEY NOT NULL REFERENCES private_rooms(code) ON UPDATE CASCADE ON DELETE CASCADE,
        game_id TEXT NOT NULL UNIQUE REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
        joining_player_id TEXT NOT NULL REFERENCES players(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS durable_matchmaking_claims (
        entry_id TEXT PRIMARY KEY NOT NULL REFERENCES matchmaking_entries(id) ON UPDATE CASCADE ON DELETE CASCADE,
        game_id TEXT NOT NULL REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      "CREATE INDEX IF NOT EXISTS durable_matchmaking_claims_game_idx ON durable_matchmaking_claims(game_id)",
      `CREATE TABLE IF NOT EXISTS durable_matchmaking_presence (
        player_id TEXT PRIMARY KEY NOT NULL REFERENCES players(id) ON UPDATE CASCADE ON DELETE CASCADE,
        entry_id TEXT NOT NULL UNIQUE REFERENCES matchmaking_entries(id) ON UPDATE CASCADE ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS durable_player_events (
        id TEXT PRIMARY KEY NOT NULL,
        player_id TEXT NOT NULL REFERENCES players(id) ON UPDATE CASCADE ON DELETE CASCADE,
        game_id TEXT REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
        payload TEXT NOT NULL,
        delivered_at INTEGER,
        created_at_ms INTEGER NOT NULL
      )`,
      "CREATE INDEX IF NOT EXISTS durable_player_events_pending_idx ON durable_player_events(player_id, delivered_at, created_at_ms)",
      "CREATE INDEX IF NOT EXISTS durable_player_events_game_idx ON durable_player_events(game_id, created_at_ms)",
      `CREATE TABLE IF NOT EXISTS durable_rematches (
        source_game_id TEXT PRIMARY KEY NOT NULL REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
        rematch_game_id TEXT NOT NULL UNIQUE REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TRIGGER IF NOT EXISTS durable_game_command_version_guard
        BEFORE INSERT ON durable_game_command_guards
        FOR EACH ROW
        WHEN NOT EXISTS (
          SELECT 1
          FROM games g
          JOIN command_deduplication c ON c.command_id = NEW.command_id
          WHERE g.id = NEW.game_id
            AND g.version = NEW.expected_version
            AND c.game_id = g.id
            AND c.player_id IN (g.red_player_id, g.black_player_id)
        )
        BEGIN
          SELECT RAISE(ABORT, 'VERSION_OR_AUTH_CONFLICT');
        END`,
    ];
    await database.batch(statements.map((sql) => database.prepare(sql)));
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function cookieValue(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function sessionCookie(request: Request, token: string): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}${secure}`;
}

function randomToken(bytes = 32): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  value.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== "string") return `Guest ${randomToken(3).slice(0, 4).toUpperCase()}`;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 64);
  return normalized || `Guest ${randomToken(3).slice(0, 4).toUpperCase()}`;
}

async function findGuest(request: Request): Promise<Guest | null> {
  await ensureDurableSchema();
  const token = cookieValue(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await db()
    .prepare(
      `SELECT p.id, COALESCE(dgp.display_name, 'Guest') AS display_name
       FROM guest_identities gi
       JOIN players p ON p.id = gi.player_id
       LEFT JOIN durable_guest_profiles dgp ON dgp.player_id = p.id
       WHERE gi.signed_token_ref = ? AND p.kind = 'guest' AND p.status = 'active'`,
    )
    .bind(tokenHash)
    .first<{ id: string; display_name: string }>();
  if (!row) return null;
  return { id: row.id, kind: "guest", displayName: row.display_name, rating: 1500 };
}

async function requireGuest(request: Request): Promise<Guest> {
  const guest = await findGuest(request);
  if (!guest) {
    throw new DurableGameError(
      401,
      "SESSION_REQUIRED",
      "Create or restore a guest session before using online play.",
    );
  }
  await db()
    .prepare("UPDATE guest_identities SET last_active_at = CURRENT_TIMESTAMP WHERE player_id = ?")
    .bind(guest.id)
    .run();
  return guest;
}

export async function createGuestSession(
  request: Request,
  body: unknown,
): Promise<Response> {
  await ensureDurableSchema();
  const displayName = normalizeDisplayName(
    body && typeof body === "object" ? (body as { displayName?: unknown }).displayName : undefined,
  );
  const existing = await findGuest(request);
  if (existing) {
    await db()
      .prepare(
        `INSERT INTO durable_guest_profiles(player_id, display_name, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(player_id) DO UPDATE SET display_name = excluded.display_name, updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(existing.id, displayName)
      .run();
    return Response.json({ player: { ...existing, displayName } });
  }

  const token = randomToken();
  const tokenHash = await sha256(token);
  const playerId = crypto.randomUUID();
  const database = db();
  await database.batch([
    database
      .prepare("INSERT INTO players(id, kind, status) VALUES (?, 'guest', 'active')")
      .bind(playerId),
    database
      .prepare("INSERT INTO guest_identities(player_id, signed_token_ref) VALUES (?, ?)")
      .bind(playerId, tokenHash),
    database
      .prepare("INSERT INTO durable_guest_profiles(player_id, display_name) VALUES (?, ?)")
      .bind(playerId, displayName),
  ]);
  return Response.json(
    { player: { id: playerId, kind: "guest", displayName, rating: 1500 } },
    { status: 201, headers: { "set-cookie": sessionCookie(request, token) } },
  );
}

async function publicPlayer(database: D1, playerId: string): Promise<PublicPlayer> {
  const row = await database
    .prepare(
      `SELECT p.id, p.kind,
              COALESCE(u.display_name, dgp.display_name, 'Guest') AS display_name,
              COALESCE(pr.rating, 1500) AS rating
       FROM players p
       LEFT JOIN users u ON u.player_id = p.id
       LEFT JOIN durable_guest_profiles dgp ON dgp.player_id = p.id
       LEFT JOIN player_ratings pr ON pr.player_id = p.id AND pr.game_mode = 'xiangqi'
       WHERE p.id = ?`,
    )
    .bind(playerId)
    .first<{ id: string; kind: "user" | "guest"; display_name: string; rating: number }>();
  if (!row) throw new DurableGameError(404, "PLAYER_NOT_FOUND", "A game player no longer exists.");
  return { id: row.id, kind: row.kind, displayName: row.display_name, rating: row.rating };
}

function clockAt(game: GameRow, now = Date.now()): AuthoritativeClock {
  let redMs = game.red_time_ms;
  let blackMs = game.black_time_ms;
  if (game.status === "active" && game.clock_running) {
    const elapsed = Math.max(0, now - game.clock_measured_at);
    if (game.clock_running === "red") redMs = Math.max(0, redMs - elapsed);
    else blackMs = Math.max(0, blackMs - elapsed);
  }
  return {
    redMs,
    blackMs,
    running: game.status === "active" ? game.clock_running : null,
    measuredAt: now,
  };
}

async function gameRow(database: D1, gameId: string): Promise<GameRow | null> {
  return database
    .prepare(
      `SELECT g.*,
              dgn.draw_offered_by,
              dgn.rematch_requested_by
       FROM games g
       LEFT JOIN durable_game_negotiations dgn ON dgn.game_id = g.id
       WHERE g.id = ?`,
    )
    .bind(gameId)
    .first<GameRow>();
}

function colorFor(game: GameRow, playerId: string): Color | null {
  if (game.red_player_id === playerId) return "red";
  if (game.black_player_id === playerId) return "black";
  return null;
}

async function settleTimeout(database: D1, game: GameRow): Promise<GameRow> {
  const clock = clockAt(game);
  const timedOut =
    game.status === "active" &&
    game.clock_running !== null &&
    (game.clock_running === "red" ? clock.redMs : clock.blackMs) === 0;
  if (!timedOut) return game;

  const loser = game.clock_running!;
  const result = loser === "red" ? "black-win" : "red-win";
  const completionToken = crypto.randomUUID();
  const databaseStatements = [
    database
      .prepare(
        `INSERT INTO game_completions(game_id, completion_token, result, termination_reason)
         VALUES (?, ?, ?, 'timeout')`,
      )
      .bind(game.id, completionToken, result),
    database
      .prepare(
        `UPDATE games
         SET status = 'completed', result = ?, termination_reason = 'timeout',
             completion_token = ?, red_time_ms = ?, black_time_ms = ?,
             clock_running = NULL, clock_measured_at = ?, version = version + 1,
             ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND version = ? AND status = 'active'`,
      )
      .bind(result, completionToken, clock.redMs, clock.blackMs, Date.now(), game.id, game.version),
    database
      .prepare("DELETE FROM durable_game_negotiations WHERE game_id = ?")
      .bind(game.id),
  ];
  try {
    await database.batch(databaseStatements);
  } catch {
    // Another request may have completed the same authoritative timeout.
  }
  return (await gameRow(database, game.id)) ?? game;
}

async function snapshot(database: D1, gameId: string): Promise<GameSnapshot> {
  const loaded = await gameRow(database, gameId);
  if (!loaded) throw new DurableGameError(404, "GAME_NOT_FOUND", "That game does not exist.");
  const game = await settleTimeout(database, loaded);
  const moveRows = await database
    .prepare(
      `SELECT sequence, moving_color, from_column, from_row, to_column, to_row, captured_piece
       FROM moves WHERE game_id = ? ORDER BY sequence ASC`,
    )
    .bind(game.id)
    .all<{
      sequence: number;
      moving_color: Color;
      from_column: number;
      from_row: number;
      to_column: number;
      to_row: number;
      captured_piece: PublicMove["capturedPiece"];
    }>();
  const moves: PublicMove[] = (moveRows.results ?? []).map((row) => ({
    sequence: row.sequence,
    color: row.moving_color,
    move: {
      from: { column: row.from_column, row: row.from_row },
      to: { column: row.to_column, row: row.to_row },
    },
    capturedPiece: row.captured_piece,
  }));
  return {
    gameId: game.id,
    version: game.version,
    moveSequence: game.move_sequence,
    currentTurn: game.current_turn,
    serializedPosition: game.current_position,
    clock: clockAt(game),
    status: game.status === "cancelled" ? "completed" : game.status,
    result: game.result,
    terminationReason: game.termination_reason,
    timeControlId: game.time_control_id,
    rated: Boolean(game.rated),
    redPlayer: await publicPlayer(database, game.red_player_id),
    blackPlayer: await publicPlayer(database, game.black_player_id),
    drawOfferedBy: game.draw_offered_by,
    rematchRequestedBy: game.rematch_requested_by,
    moves,
  };
}

function eventStatement(
  database: D1,
  playerId: string,
  gameId: string | null,
  event: ServerEvent,
): D1PreparedStatement {
  return database
    .prepare(
      `INSERT INTO durable_player_events(id, player_id, game_id, payload, created_at_ms)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), playerId, gameId, JSON.stringify(event), Date.now());
}

function dedupStatement(
  database: D1,
  command: ClientCommand,
  playerId: string,
  gameId: string | null,
  response: { events: ServerEvent[] },
): D1PreparedStatement {
  return database
    .prepare(
      `INSERT INTO command_deduplication(command_id, game_id, player_id, command_type, stored_response)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(command.commandId, gameId, playerId, command.type, JSON.stringify(response));
}

async function priorCommand(
  database: D1,
  commandId: string,
  playerId: string,
): Promise<{ events: ServerEvent[] } | null> {
  const row = await database
    .prepare(
      "SELECT player_id, stored_response FROM command_deduplication WHERE command_id = ?",
    )
    .bind(commandId)
    .first<{ player_id: string; stored_response: string }>();
  if (!row) return null;
  if (row.player_id !== playerId) {
    throw new DurableGameError(409, "COMMAND_ID_REUSED", "That command id belongs to another player.");
  }
  return JSON.parse(row.stored_response) as { events: ServerEvent[] };
}

function guardStatement(
  database: D1,
  commandId: string,
  gameId: string,
  expectedVersion: number,
): D1PreparedStatement {
  return database
    .prepare(
      `INSERT INTO durable_game_command_guards(command_id, game_id, expected_version)
       VALUES (?, ?, ?)`,
    )
    .bind(commandId, gameId, expectedVersion);
}

function gameInsertStatement(
  database: D1,
  gameId: string,
  roomType: GameRow["room_type"],
  redPlayerId: string,
  blackPlayerId: string,
  timeControlId: TimeControlId,
  rated: boolean,
): D1PreparedStatement {
  const position = createInitialPosition();
  const serialized = serializePosition(position);
  const control = TIME_CONTROLS[timeControlId];
  const now = Date.now();
  return database
    .prepare(
      `INSERT INTO games(
        id, room_type, rated, time_control_id, initial_ms, increment_ms,
        red_player_id, black_player_id, initial_position, current_position,
        position_hash, version, move_sequence, current_turn, red_time_ms,
        black_time_ms, clock_running, clock_measured_at, status, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'red', ?, ?, 'red', ?, 'active', CURRENT_TIMESTAMP)`,
    )
    .bind(
      gameId,
      roomType,
      rated ? 1 : 0,
      timeControlId,
      control.initialMs,
      control.incrementMs,
      redPlayerId,
      blackPlayerId,
      serialized,
      serialized,
      createPositionHash(position),
      control.initialMs,
      control.initialMs,
      now,
    );
}

function randomRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join("");
}

function isConstraintFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /constraint|unique|version_or_auth_conflict/i.test(message);
}

async function createPrivateRoom(
  database: D1,
  request: Request,
  guest: Guest,
  command: Extract<ClientCommand, { type: "createPrivateRoom" }>,
): Promise<{ events: ServerEvent[] }> {
  const expiresAt = Date.now() + 30 * 60_000;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const roomCode = randomRoomCode();
    const event: ServerEvent = {
      type: "roomCreated",
      roomCode,
      joinUrl: new URL(`/game/${roomCode}`, request.url).toString(),
    };
    const response = { events: [event] };
    try {
      await database.batch([
        database
          .prepare(
            `INSERT INTO private_rooms(code, owner_player_id, time_control_id, status, expires_at)
             VALUES (?, ?, ?, 'waiting', ?)`,
          )
          .bind(roomCode, guest.id, command.timeControlId, expiresAt),
        dedupStatement(database, command, guest.id, null, response),
      ]);
      return response;
    } catch (error) {
      const prior = await priorCommand(database, command.commandId, guest.id);
      if (prior) return prior;
      if (!isConstraintFailure(error)) throw error;
    }
  }
  throw new DurableGameError(503, "ROOM_CODE_EXHAUSTED", "A private room could not be allocated. Try again.");
}

async function joinPrivateRoom(
  database: D1,
  guest: Guest,
  command: Extract<ClientCommand, { type: "joinPrivateRoom" }>,
): Promise<{ events: ServerEvent[] }> {
  const room = await database
    .prepare(
      `SELECT code, owner_player_id, time_control_id, status, expires_at
       FROM private_rooms WHERE code = ?`,
    )
    .bind(command.roomCode)
    .first<{
      code: string;
      owner_player_id: string;
      time_control_id: TimeControlId;
      status: "waiting" | "joined" | "expired" | "cancelled";
      expires_at: number;
    }>();
  if (!room || room.status !== "waiting" || room.expires_at <= Date.now()) {
    throw new DurableGameError(404, "ROOM_UNAVAILABLE", "That room is missing, expired, or already joined.");
  }
  if (room.owner_player_id === guest.id) {
    throw new DurableGameError(409, "SELF_PLAY", "Open the invite in a different guest browser session.");
  }

  const gameId = crypto.randomUUID();
  const joinerEvent: ServerEvent = { type: "roomJoined", gameId, color: "black" };
  const ownerEvent: ServerEvent = { type: "roomJoined", gameId, color: "red" };
  const response = { events: [joinerEvent] };
  try {
    await database.batch([
      gameInsertStatement(
        database,
        gameId,
        "private",
        room.owner_player_id,
        guest.id,
        room.time_control_id,
        false,
      ),
      database
        .prepare(
          `INSERT INTO durable_room_claims(room_code, game_id, joining_player_id)
           VALUES (?, ?, ?)`,
        )
        .bind(room.code, gameId, guest.id),
      database
        .prepare(
          `UPDATE private_rooms SET game_id = ?, status = 'joined'
           WHERE code = ? AND status = 'waiting' AND expires_at > ?`,
        )
        .bind(gameId, room.code, Date.now()),
      dedupStatement(database, command, guest.id, gameId, response),
      eventStatement(database, room.owner_player_id, gameId, ownerEvent),
    ]);
    return response;
  } catch (error) {
    const prior = await priorCommand(database, command.commandId, guest.id);
    if (prior) return prior;
    if (isConstraintFailure(error)) {
      throw new DurableGameError(409, "ROOM_ALREADY_JOINED", "Another player joined that room first.");
    }
    throw error;
  }
}

async function joinMatchmaking(
  database: D1,
  guest: Guest,
  command: Extract<ClientCommand, { type: "joinMatchmaking" }>,
): Promise<{ events: ServerEvent[] }> {
  if (command.rated) {
    throw new DurableGameError(403, "RATED_REQUIRES_ACCOUNT", "Rated games require a signed-in account.");
  }
  const alreadyWaiting = await database
    .prepare(
      `SELECT me.id
       FROM durable_matchmaking_presence dmp
       JOIN matchmaking_entries me ON me.id = dmp.entry_id
       WHERE dmp.player_id = ? AND me.status = 'waiting'`,
    )
    .bind(guest.id)
    .first<{ id: string }>();
  if (alreadyWaiting) {
    const response = { events: [] as ServerEvent[] };
    await database.batch([dedupStatement(database, command, guest.id, null, response)]);
    return response;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const cutoff = Date.now() - 45_000;
    const opponent = await database
      .prepare(
        `SELECT me.id, me.player_id
         FROM matchmaking_entries me
         JOIN durable_matchmaking_presence dmp ON dmp.entry_id = me.id
         LEFT JOIN durable_matchmaking_claims dmc ON dmc.entry_id = me.id
         WHERE me.status = 'waiting' AND me.time_control_id = ? AND me.rated = 0
           AND me.player_id <> ? AND me.last_heartbeat_at >= ? AND dmc.entry_id IS NULL
         ORDER BY me.joined_at ASC LIMIT 1`,
      )
      .bind(command.timeControlId, guest.id, cutoff)
      .first<{ id: string; player_id: string }>();

    const entryId = crypto.randomUUID();
    if (!opponent) {
      const response = { events: [] as ServerEvent[] };
      try {
        await database.batch([
          database
            .prepare(
              `INSERT INTO matchmaking_entries(
                 id, player_id, time_control_id, rated, rating, status, joined_at, last_heartbeat_at
               ) VALUES (?, ?, ?, 0, 1500, 'waiting', ?, ?)`,
            )
            .bind(entryId, guest.id, command.timeControlId, Date.now(), Date.now()),
          database
            .prepare("INSERT INTO durable_matchmaking_presence(player_id, entry_id) VALUES (?, ?)")
            .bind(guest.id, entryId),
          dedupStatement(database, command, guest.id, null, response),
        ]);
        return response;
      } catch (error) {
        const prior = await priorCommand(database, command.commandId, guest.id);
        if (prior) return prior;
        if (!isConstraintFailure(error)) throw error;
        continue;
      }
    }

    const gameId = crypto.randomUUID();
    const myEvent: ServerEvent = { type: "matchFound", gameId, color: "black" };
    const opponentEvent: ServerEvent = { type: "matchFound", gameId, color: "red" };
    const response = { events: [myEvent] };
    try {
      await database.batch([
        database
          .prepare(
            `INSERT INTO matchmaking_entries(
               id, player_id, time_control_id, rated, rating, status, joined_at, last_heartbeat_at, matched_game_id
             ) VALUES (?, ?, ?, 0, 1500, 'matched', ?, ?, ?)`,
          )
          .bind(entryId, guest.id, command.timeControlId, Date.now(), Date.now(), gameId),
        gameInsertStatement(
          database,
          gameId,
          "matchmaking",
          opponent.player_id,
          guest.id,
          command.timeControlId,
          false,
        ),
        database
          .prepare("INSERT INTO durable_matchmaking_claims(entry_id, game_id) VALUES (?, ?)")
          .bind(opponent.id, gameId),
        database
          .prepare("INSERT INTO durable_matchmaking_claims(entry_id, game_id) VALUES (?, ?)")
          .bind(entryId, gameId),
        database
          .prepare(
            `UPDATE matchmaking_entries
             SET status = 'matched', matched_game_id = ?
             WHERE id = ? AND status = 'waiting'`,
          )
          .bind(gameId, opponent.id),
        database
          .prepare("DELETE FROM durable_matchmaking_presence WHERE player_id IN (?, ?)")
          .bind(guest.id, opponent.player_id),
        dedupStatement(database, command, guest.id, gameId, response),
        eventStatement(database, opponent.player_id, gameId, opponentEvent),
      ]);
      return response;
    } catch (error) {
      const prior = await priorCommand(database, command.commandId, guest.id);
      if (prior) return prior;
      if (!isConstraintFailure(error)) throw error;
    }
  }
  throw new DurableGameError(409, "MATCH_RACE", "Another match claimed that opponent. Try searching again.");
}

async function leaveMatchmaking(
  database: D1,
  guest: Guest,
  command: Extract<ClientCommand, { type: "leaveMatchmaking" }>,
): Promise<{ events: ServerEvent[] }> {
  const response = { events: [] as ServerEvent[] };
  await database.batch([
    database
      .prepare(
        `UPDATE matchmaking_entries SET status = 'cancelled'
         WHERE id IN (SELECT entry_id FROM durable_matchmaking_presence WHERE player_id = ?)
           AND status = 'waiting'`,
      )
      .bind(guest.id),
    database
      .prepare("DELETE FROM durable_matchmaking_presence WHERE player_id = ?")
      .bind(guest.id),
    dedupStatement(database, command, guest.id, null, response),
  ]);
  return response;
}

function completedSnapshot(
  current: GameSnapshot,
  version: number,
  clock: AuthoritativeClock,
  result: NonNullable<GameSnapshot["result"]>,
  terminationReason: NonNullable<GameSnapshot["terminationReason"]>,
): GameSnapshot {
  return {
    ...current,
    version,
    clock: { ...clock, running: null },
    status: "completed",
    result,
    terminationReason,
    drawOfferedBy: null,
    rematchRequestedBy: null,
  };
}

async function publishOpponent(
  database: D1,
  game: GameRow,
  actorId: string,
  event: ServerEvent,
): Promise<void> {
  const opponentId = game.red_player_id === actorId ? game.black_player_id : game.red_player_id;
  await eventStatement(database, opponentId, game.id, event).run();
}

async function rememberConflict(
  database: D1,
  command: Extract<ClientCommand, { expectedVersion: number }>,
  guest: Guest,
  current: GameSnapshot,
): Promise<{ events: ServerEvent[] }> {
  const event: ServerEvent =
    command.type === "submitMove"
      ? {
          type: "moveRejected",
          commandId: command.commandId,
          reason: "The game changed before that command arrived. The latest position has been restored.",
          snapshot: current,
        }
      : {
          type: "protocolError",
          code: "VERSION_CONFLICT",
          message: "The game changed before that command arrived. The latest state has been restored.",
        };
  const response = { events: [event] };
  try {
    await dedupStatement(database, command, guest.id, command.gameId, response).run();
  } catch {
    return (await priorCommand(database, command.commandId, guest.id)) ?? response;
  }
  return response;
}

async function mutateGame(
  database: D1,
  guest: Guest,
  command: Extract<ClientCommand, { expectedVersion: number }>,
): Promise<{ events: ServerEvent[] }> {
  let game = await gameRow(database, command.gameId);
  if (!game) throw new DurableGameError(404, "GAME_NOT_FOUND", "That game does not exist.");
  const color = colorFor(game, guest.id);
  if (!color) throw new DurableGameError(403, "NOT_A_PLAYER", "This guest is not a player in that game.");
  game = await settleTimeout(database, game);
  const current = await snapshot(database, game.id);

  if (command.type === "requestStateSync") {
    const response = { events: [{ type: "stateSnapshot", snapshot: current } as ServerEvent] };
    try {
      await dedupStatement(database, command, guest.id, game.id, response).run();
    } catch {
      return (await priorCommand(database, command.commandId, guest.id)) ?? response;
    }
    return response;
  }
  if (command.expectedVersion !== game.version) {
    return rememberConflict(database, command, guest, current);
  }

  const opponentColor: Color = color === "red" ? "black" : "red";
  const now = Date.now();
  const databaseClock = clockAt(game, now);
  let response: { events: ServerEvent[] };
  let opponentEvent: ServerEvent | null = null;
  const statements: D1PreparedStatement[] = [];

  if (command.type === "submitMove") {
    if (game.status !== "active") throw new DurableGameError(409, "GAME_NOT_ACTIVE", "That game has ended.");
    if (game.current_turn !== color) {
      const event: ServerEvent = {
        type: "moveRejected",
        commandId: command.commandId,
        reason: `It is ${game.current_turn === "red" ? "Red" : "Black"}'s turn.`,
        snapshot: current,
      };
      response = { events: [event] };
      await dedupStatement(database, command, guest.id, game.id, response).run();
      return response;
    }
    const position = deserializePosition(game.current_position);
    const explanation = explainMove(position, command.move);
    if (!explanation.legal) {
      const event: ServerEvent = {
        type: "moveRejected",
        commandId: command.commandId,
        reason: explanation.message,
        snapshot: current,
      };
      response = { events: [event] };
      await dedupStatement(database, command, guest.id, game.id, response).run();
      return response;
    }
    const capturedPiece = getPiece(position, command.move.to)?.type ?? null;
    const nextPosition = applyMove(position, command.move);
    const serialized = serializePosition(nextPosition);
    const nextHash = createPositionHash(nextPosition);
    const historyRows = await database
      .prepare("SELECT position_hash FROM moves WHERE game_id = ? ORDER BY sequence ASC")
      .bind(game.id)
      .all<{ position_hash: string }>();
    const status = getGameStatus(nextPosition, [
      createPositionHash(deserializePosition(game.initial_position)),
      ...(historyRows.results ?? []).map((row) => row.position_hash),
    ]);
    const control = TIME_CONTROLS[game.time_control_id];
    const nextClock: AuthoritativeClock = {
      redMs:
        color === "red"
          ? databaseClock.redMs + control.incrementMs
          : databaseClock.redMs,
      blackMs:
        color === "black"
          ? databaseClock.blackMs + control.incrementMs
          : databaseClock.blackMs,
      running: status.isTerminal ? null : opponentColor,
      measuredAt: now,
    };
    const publicMove: PublicMove = {
      sequence: game.move_sequence + 1,
      color,
      move: command.move,
      capturedPiece,
    };
    let next: GameSnapshot = {
      ...current,
      version: game.version + 1,
      moveSequence: game.move_sequence + 1,
      currentTurn: opponentColor,
      serializedPosition: serialized,
      clock: nextClock,
      moves: [...current.moves, publicMove],
      drawOfferedBy: null,
    };
    if (status.isTerminal) {
      next = completedSnapshot(
        next,
        next.version,
        nextClock,
        status.result!,
        status.terminationReason!,
      );
    }
    const actorEvent: ServerEvent = status.isTerminal
      ? { type: "gameEnded", snapshot: next }
      : { type: "moveAccepted", commandId: command.commandId, snapshot: next };
    opponentEvent = status.isTerminal
      ? { type: "gameEnded", snapshot: next }
      : { type: "stateSnapshot", snapshot: next };
    response = { events: [actorEvent] };
    statements.push(
      database
        .prepare(
          `INSERT INTO moves(
             id, game_id, sequence, moving_color, from_column, from_row, to_column, to_row,
             captured_piece, position_after, position_hash, red_time_ms, black_time_ms
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          game.id,
          publicMove.sequence,
          color,
          command.move.from.column,
          command.move.from.row,
          command.move.to.column,
          command.move.to.row,
          capturedPiece,
          serialized,
          nextHash,
          nextClock.redMs,
          nextClock.blackMs,
        ),
    );
    if (status.isTerminal) {
      const completionToken = crypto.randomUUID();
      statements.push(
        database
          .prepare(
            `INSERT INTO game_completions(game_id, completion_token, result, termination_reason)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(game.id, completionToken, status.result, status.terminationReason),
        database
          .prepare(
            `UPDATE games SET current_position = ?, position_hash = ?, version = version + 1,
               move_sequence = move_sequence + 1, current_turn = ?, red_time_ms = ?, black_time_ms = ?,
               clock_running = NULL, clock_measured_at = ?, status = 'completed', result = ?,
               termination_reason = ?, completion_token = ?, ended_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND version = ? AND status = 'active'`,
          )
          .bind(
            serialized,
            nextHash,
            opponentColor,
            nextClock.redMs,
            nextClock.blackMs,
            now,
            status.result,
            status.terminationReason,
            completionToken,
            game.id,
            game.version,
          ),
      );
    } else {
      statements.push(
        database
          .prepare(
            `UPDATE games SET current_position = ?, position_hash = ?, version = version + 1,
               move_sequence = move_sequence + 1, current_turn = ?, red_time_ms = ?, black_time_ms = ?,
               clock_running = ?, clock_measured_at = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND version = ? AND status = 'active'`,
          )
          .bind(
            serialized,
            nextHash,
            opponentColor,
            nextClock.redMs,
            nextClock.blackMs,
            opponentColor,
            now,
            game.id,
            game.version,
          ),
      );
    }
    statements.push(database.prepare("DELETE FROM durable_game_negotiations WHERE game_id = ?").bind(game.id));
  } else if (command.type === "resign") {
    if (game.status !== "active") throw new DurableGameError(409, "GAME_NOT_ACTIVE", "That game has ended.");
    const result = color === "red" ? "black-win" : "red-win";
    const next = completedSnapshot(current, game.version + 1, databaseClock, result, "resignation");
    const event: ServerEvent = { type: "gameEnded", snapshot: next };
    response = { events: [event] };
    opponentEvent = event;
    const completionToken = crypto.randomUUID();
    statements.push(
      database
        .prepare("INSERT INTO game_completions(game_id, completion_token, result, termination_reason) VALUES (?, ?, ?, 'resignation')")
        .bind(game.id, completionToken, result),
      database
        .prepare(
          `UPDATE games SET version = version + 1, status = 'completed', result = ?,
             termination_reason = 'resignation', completion_token = ?, red_time_ms = ?, black_time_ms = ?,
             clock_running = NULL, clock_measured_at = ?, ended_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ? AND status = 'active'`,
        )
        .bind(result, completionToken, databaseClock.redMs, databaseClock.blackMs, now, game.id, game.version),
      database.prepare("DELETE FROM durable_game_negotiations WHERE game_id = ?").bind(game.id),
    );
  } else if (command.type === "offerDraw") {
    if (game.status !== "active") throw new DurableGameError(409, "GAME_NOT_ACTIVE", "That game has ended.");
    if (game.draw_offered_by) throw new DurableGameError(409, "DRAW_ALREADY_OFFERED", "A draw offer is already pending.");
    const next = { ...current, version: game.version + 1, drawOfferedBy: color };
    const event: ServerEvent = { type: "drawOffered", gameId: game.id, snapshot: next };
    response = { events: [event] };
    opponentEvent = event;
    statements.push(
      database
        .prepare(
          `INSERT INTO durable_game_negotiations(game_id, draw_offered_by, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(game_id) DO UPDATE SET draw_offered_by = excluded.draw_offered_by, updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(game.id, color),
      database
        .prepare("UPDATE games SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ? AND status = 'active'")
        .bind(game.id, game.version),
    );
  } else if (command.type === "respondToDraw") {
    if (game.status !== "active" || game.draw_offered_by !== opponentColor) {
      throw new DurableGameError(409, "NO_DRAW_OFFER", "There is no opponent draw offer to answer.");
    }
    if (command.accept) {
      const next = completedSnapshot(current, game.version + 1, databaseClock, "draw", "draw-agreement");
      const event: ServerEvent = { type: "gameEnded", snapshot: next };
      response = { events: [event] };
      opponentEvent = event;
      const completionToken = crypto.randomUUID();
      statements.push(
        database
          .prepare("INSERT INTO game_completions(game_id, completion_token, result, termination_reason) VALUES (?, ?, 'draw', 'draw-agreement')")
          .bind(game.id, completionToken),
        database
          .prepare(
            `UPDATE games SET version = version + 1, status = 'completed', result = 'draw',
               termination_reason = 'draw-agreement', completion_token = ?, red_time_ms = ?, black_time_ms = ?,
               clock_running = NULL, clock_measured_at = ?, ended_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ? AND status = 'active'`,
          )
          .bind(completionToken, databaseClock.redMs, databaseClock.blackMs, now, game.id, game.version),
        database.prepare("DELETE FROM durable_game_negotiations WHERE game_id = ?").bind(game.id),
      );
    } else {
      const next = { ...current, version: game.version + 1, drawOfferedBy: null };
      const event: ServerEvent = { type: "drawOfferCancelled", gameId: game.id, snapshot: next };
      response = { events: [event] };
      opponentEvent = event;
      statements.push(
        database
          .prepare("UPDATE durable_game_negotiations SET draw_offered_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE game_id = ?")
          .bind(game.id),
        database
          .prepare("UPDATE games SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?")
          .bind(game.id, game.version),
      );
    }
  } else if (command.type === "requestRematch") {
    if (game.status !== "completed") throw new DurableGameError(409, "GAME_NOT_COMPLETED", "A rematch is available after the game ends.");
    const next = { ...current, version: game.version + 1, rematchRequestedBy: color };
    const event: ServerEvent = { type: "rematchRequested", gameId: game.id, snapshot: next };
    response = { events: [event] };
    opponentEvent = event;
    statements.push(
      database
        .prepare(
          `INSERT INTO durable_game_negotiations(game_id, rematch_requested_by, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(game_id) DO UPDATE SET rematch_requested_by = excluded.rematch_requested_by, updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(game.id, color),
      database
        .prepare("UPDATE games SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?")
        .bind(game.id, game.version),
    );
  } else if (command.type === "respondToRematch") {
    if (game.status !== "completed" || game.rematch_requested_by !== opponentColor) {
      throw new DurableGameError(409, "NO_REMATCH_REQUEST", "There is no opponent rematch request to answer.");
    }
    if (!command.accept) {
      const next = { ...current, version: game.version + 1, rematchRequestedBy: null };
      const event: ServerEvent = { type: "stateSnapshot", snapshot: next };
      response = { events: [event] };
      opponentEvent = event;
      statements.push(
        database
          .prepare("UPDATE durable_game_negotiations SET rematch_requested_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE game_id = ?")
          .bind(game.id),
        database
          .prepare("UPDATE games SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?")
          .bind(game.id, game.version),
      );
    } else {
      const rematchId = crypto.randomUUID();
      const newRedId = game.black_player_id;
      const newBlackId = game.red_player_id;
      const myNewColor: Color = newRedId === guest.id ? "red" : "black";
      const theirNewColor: Color = myNewColor === "red" ? "black" : "red";
      const myEvent: ServerEvent = { type: "matchFound", gameId: rematchId, color: myNewColor };
      opponentEvent = { type: "matchFound", gameId: rematchId, color: theirNewColor };
      response = { events: [myEvent] };
      statements.push(
        gameInsertStatement(database, rematchId, "rematch", newRedId, newBlackId, game.time_control_id, Boolean(game.rated)),
        database
          .prepare("INSERT INTO durable_rematches(source_game_id, rematch_game_id) VALUES (?, ?)")
          .bind(game.id, rematchId),
        database.prepare("DELETE FROM durable_game_negotiations WHERE game_id = ?").bind(game.id),
        database
          .prepare("UPDATE games SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?")
          .bind(game.id, game.version),
      );
    }
  } else {
    throw new DurableGameError(400, "UNSUPPORTED_COMMAND", "That game command is not supported.");
  }

  try {
    await database.batch([
      dedupStatement(database, command, guest.id, game.id, response),
      guardStatement(database, command.commandId, game.id, command.expectedVersion),
      ...statements,
    ]);
  } catch (error) {
    const prior = await priorCommand(database, command.commandId, guest.id);
    if (prior) return prior;
    if (isConstraintFailure(error)) {
      const latest = await snapshot(database, game.id);
      return rememberConflict(database, command, guest, latest);
    }
    throw error;
  }
  if (opponentEvent) await publishOpponent(database, game, guest.id, opponentEvent);
  return response;
}
