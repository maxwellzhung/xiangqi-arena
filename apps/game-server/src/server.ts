import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { SlidingWindowRateLimiter } from "./authorization.js";
import { InMemoryRatingLedger } from "./elo.js";
import { xiangqiRulesEngine } from "./engine-adapter.js";
import { EventHub } from "./events.js";
import { PublicError, publicMessage } from "./errors.js";
import { GameService } from "./game-service.js";
import { IdempotencyRegistry } from "./idempotency.js";
import { MatchmakingService } from "./matchmaking-service.js";
import { PresenceService, ReconnectionTokens } from "./presence.js";
import {
  InMemoryGameRepository,
  InMemoryIdentityRepository,
} from "./repository.js";
import { RealtimeGateway } from "./realtime-gateway.js";
import { PrivateRoomService } from "./room-service.js";
import { SessionService } from "./session.js";
import { systemTime } from "./types.js";

const guestSessionSchema = z
  .object({ displayName: z.string().min(2).max(64) })
  .strict();
const reconnectSchema = z
  .object({ gameId: z.string().min(8), token: z.string().min(32).optional() })
  .strict();

export interface GameServerConfig {
  host: string;
  port: number;
  sessionSecret: string;
  publicWebOrigin: string;
  allowedOrigins: Set<string>;
}

function json(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  response.end(body);
}

async function readJson(
  request: IncomingMessage,
  maxBytes = 32 * 1_024,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes)
      throw new PublicError("PAYLOAD_TOO_LARGE", "Payload is too large.", 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PublicError("INVALID_JSON", "Request body must be valid JSON.");
  }
}

function bearer(request: IncomingMessage): string | undefined {
  const value = request.headers.authorization;
  return Array.isArray(value) ? value[0] : value;
}

function log(
  level: "info" | "error",
  message: string,
  data: Record<string, unknown> = {},
): void {
  const output = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  });
  if (level === "error") process.stderr.write(`${output}\n`);
  else process.stdout.write(`${output}\n`);
}

export function createGameServer(config: GameServerConfig) {
  const identities = new InMemoryIdentityRepository();
  const gameRepository = new InMemoryGameRepository();
  const ratings = new InMemoryRatingLedger();
  const games = new GameService(
    gameRepository,
    xiangqiRulesEngine,
    ratings,
    systemTime,
  );
  const rooms = new PrivateRoomService(games, config.publicWebOrigin);
  const matchmaking = new MatchmakingService(games);
  const idempotency = new IdempotencyRegistry();
  const eventHub = new EventHub();
  const gateway = new RealtimeGateway(
    games,
    rooms,
    matchmaking,
    idempotency,
    eventHub,
    new SlidingWindowRateLimiter(120, 60_000),
    new SlidingWindowRateLimiter(10, 15 * 60_000),
    new SlidingWindowRateLimiter(30, 60_000),
  );
  const sessions = new SessionService(identities, config.sessionSecret);
  const reconnectTokens = new ReconnectionTokens();
  const presence = new PresenceService();
  const guestSessionLimiter = new SlidingWindowRateLimiter(10, 15 * 60_000);
  const authenticationLimiter = new SlidingWindowRateLimiter(120, 60_000);
  const startedAt = Date.now();

  const server = createServer(async (request, response) => {
    const requestId = crypto.randomUUID();
    const origin = request.headers.origin;
    if (origin && !config.allowedOrigins.has(origin)) {
      json(response, 403, {
        error: { code: "ORIGIN_REJECTED", message: "Origin is not allowed." },
      });
      return;
    }
    if (origin) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("vary", "origin");
      response.setHeader(
        "access-control-allow-headers",
        "authorization, content-type",
      );
      response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    try {
      const url = new URL(
        request.url ?? "/",
        `http://${request.headers.host ?? "localhost"}`,
      );
      if (request.method === "GET" && url.pathname === "/healthz") {
        json(response, 200, {
          status: "ok",
          uptimeSeconds: Math.floor((Date.now() - startedAt) / 1_000),
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/readyz") {
        json(response, 200, {
          status: "ready",
          checks: { commandStore: "ok", gameStore: "ok" },
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/guest-sessions") {
        guestSessionLimiter.consume(request.socket.remoteAddress ?? "unknown");
        const body = guestSessionSchema.parse(await readJson(request));
        const session = await sessions.createGuest(body.displayName);
        json(response, 201, {
          player: {
            id: session.identity.id,
            kind: session.identity.kind,
            displayName: session.identity.displayName,
          },
          accessToken: session.token,
        });
        return;
      }

      authenticationLimiter.consume(request.socket.remoteAddress ?? "unknown");
      const identity = await sessions.authenticate(bearer(request));
      if (request.method === "GET" && url.pathname === "/v1/events") {
        response.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          "x-accel-buffering": "no",
          "referrer-policy": "no-referrer",
        });
        response.write(": connected\n\n");
        const unsubscribe = eventHub.subscribe(identity.id, (event) => {
          response.write(`data: ${JSON.stringify(event)}\n\n`);
        });
        const heartbeat = setInterval(
          () => response.write(": heartbeat\n\n"),
          15_000,
        );
        request.on("close", () => {
          clearInterval(heartbeat);
          unsubscribe();
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/commands") {
        const events = await gateway.handle(identity, await readJson(request));
        json(response, 200, { events });
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/reconnect-token") {
        const { gameId } = reconnectSchema.parse(await readJson(request));
        await games.getSnapshot(gameId, identity.id);
        presence.connected(gameId, identity.id);
        json(response, 201, {
          gameId,
          reconnectToken: reconnectTokens.issue(gameId, identity.id),
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/reconnect") {
        const body = reconnectSchema
          .extend({ token: z.string().min(32) })
          .parse(await readJson(request));
        const reconnectToken = reconnectTokens.rotate(
          body.gameId,
          identity.id,
          body.token,
        );
        const snapshot = await games.getSnapshot(body.gameId, identity.id);
        presence.connected(body.gameId, identity.id);
        const participants = await games.players(body.gameId);
        eventHub.publishMany(
          participants.filter((playerId) => playerId !== identity.id),
          [{ type: "opponentReconnected", gameId: body.gameId }],
        );
        json(response, 200, { reconnectToken, snapshot });
        return;
      }
      if (request.method === "POST" && url.pathname === "/v1/disconnect") {
        const { gameId } = reconnectSchema.parse(await readJson(request));
        await games.getSnapshot(gameId, identity.id);
        const graceEndsAt = presence.disconnected(gameId, identity.id);
        const participants = await games.players(gameId);
        eventHub.publishMany(
          participants.filter((playerId) => playerId !== identity.id),
          [{ type: "opponentDisconnected", gameId, graceEndsAt }],
        );
        response.writeHead(204);
        response.end();
        return;
      }
      json(response, 404, {
        error: { code: "NOT_FOUND", message: "Route not found." },
      });
    } catch (error) {
      const status =
        error instanceof PublicError
          ? error.status
          : error instanceof z.ZodError
            ? 400
            : 500;
      if (status >= 500)
        log("error", "request failed", { requestId, error: String(error) });
      json(response, status, {
        error: {
          code:
            error instanceof PublicError
              ? error.code
              : error instanceof z.ZodError
                ? "INVALID_REQUEST"
                : "INTERNAL_ERROR",
          message:
            error instanceof z.ZodError
              ? "The request payload is invalid."
              : publicMessage(error),
        },
      });
    }
  });

  return {
    server,
    services: {
      games,
      gateway,
      sessions,
      identities,
      eventHub,
      matchmaking,
      rooms,
      presence,
    },
  };
}

export function configFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): GameServerConfig {
  const production = environment.NODE_ENV === "production";
  const sessionSecret =
    environment.SESSION_SECRET ??
    (production ? "" : "development-only-session-secret-change-me-now");
  if (Buffer.byteLength(sessionSecret) < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes");
  }
  const allowed = (
    environment.GAME_SERVER_ALLOWED_ORIGINS ?? "http://localhost:3000"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    host: environment.HOST ?? "0.0.0.0",
    port: Number.parseInt(environment.PORT ?? "3001", 10),
    sessionSecret,
    publicWebOrigin:
      environment.PUBLIC_WEB_ORIGIN ?? allowed[0] ?? "http://localhost:3000",
    allowedOrigins: new Set(allowed),
  };
}

export async function startServer(
  config = configFromEnvironment(),
): Promise<void> {
  const { server } = createGameServer(config);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => resolve());
  });
  log("info", "game server listening", {
    host: config.host,
    port: config.port,
  });
  const shutdown = (signal: string) => {
    log("info", "game server shutting down", { signal });
    server.close((error) => {
      if (error) {
        log("error", "game server shutdown failed", { error: String(error) });
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void startServer().catch((error) => {
    log("error", "game server failed to start", { error: String(error) });
    process.exitCode = 1;
  });
}
