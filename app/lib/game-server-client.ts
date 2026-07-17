"use client";

import {
  gameSnapshotSchema,
  serverEventSchema,
  type ClientCommand,
  type Color,
  type GameSnapshot,
  type ServerEvent,
} from "@/packages/shared/src";

const ACTIVE_GAME_KEY = "xiangqi-arena:active-game:v1";
const DISPLAY_NAME_KEY = "xiangqi-arena:guest-name:v1";
const PENDING_ROOM_PREFIX = "xiangqi-arena:join-room:";

export const configuredGameServerUrl =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL?.replace(/\/$/, "") || "/api";

export interface GuestSession {
  player: {
    id: string;
    kind: "guest";
    displayName: string;
  };
  serverUrl: string;
}

export interface ActiveGameRecord {
  gameId: string;
  color: Color;
  reconnectToken?: string;
}

export interface ActiveGameResponse {
  snapshot: GameSnapshot;
  color: Color;
}

export type StreamStatus = "connecting" | "open" | "reconnecting" | "closed";

export class GameServerError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "GameServerError";
  }
}

function readStoredJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function guestName(): string {
  const existing = window.localStorage.getItem(DISPLAY_NAME_KEY)?.trim();
  if (existing) return existing.slice(0, 64);
  const generated = `Guest ${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  window.localStorage.setItem(DISPLAY_NAME_KEY, generated);
  return generated;
}

export function loadActiveGame(): ActiveGameRecord | null {
  const record = readStoredJson<ActiveGameRecord>(ACTIVE_GAME_KEY);
  return record?.gameId && (record.color === "red" || record.color === "black")
    ? record
    : null;
}

export function saveActiveGame(record: ActiveGameRecord): void {
  window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(record));
}

export function clearActiveGame(gameId?: string): void {
  const current = loadActiveGame();
  if (!gameId || current?.gameId === gameId) {
    window.localStorage.removeItem(ACTIVE_GAME_KEY);
  }
}

export function stableRoomCommandId(roomCode: string): string {
  const key = `${PENDING_ROOM_PREFIX}${roomCode}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const commandId = crypto.randomUUID();
  window.sessionStorage.setItem(key, commandId);
  return commandId;
}

async function responseError(response: Response): Promise<GameServerError> {
  let code = "REQUEST_FAILED";
  let message = `Game service request failed (${response.status}).`;
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    code = body.error?.code ?? code;
    message = body.error?.message ?? message;
  } catch {
    // Keep the safe fallback; upstream bodies are not trusted.
  }
  return new GameServerError(message, response.status, code);
}

async function createGuestSession(serverUrl: string): Promise<GuestSession> {
  const response = await fetch(`${serverUrl}/v1/guest-sessions`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName: guestName() }),
  });
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as {
    player?: { id?: unknown; kind?: unknown; displayName?: unknown };
  };
  if (
    typeof body.player?.id !== "string" ||
    body.player.kind !== "guest" ||
    typeof body.player.displayName !== "string"
  ) {
    throw new GameServerError(
      "The game service returned an invalid guest session.",
      502,
      "INVALID_RESPONSE",
    );
  }
  const session: GuestSession = {
    player: {
      id: body.player.id,
      kind: "guest",
      displayName: body.player.displayName,
    },
    serverUrl,
  };
  return session;
}

async function readGuestSession(serverUrl: string): Promise<GuestSession> {
  const response = await fetch(`${serverUrl}/v1/me`, {
    credentials: "include",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as {
    player?: { id?: unknown; kind?: unknown; displayName?: unknown };
  };
  if (
    typeof body.player?.id !== "string" ||
    body.player.kind !== "guest" ||
    typeof body.player.displayName !== "string"
  ) {
    throw new GameServerError(
      "The game service returned an invalid guest identity.",
      502,
      "INVALID_RESPONSE",
    );
  }
  return {
    player: {
      id: body.player.id,
      kind: "guest",
      displayName: body.player.displayName,
    },
    serverUrl,
  };
}

export class GameServerClient {
  private constructor(
    readonly serverUrl: string,
    readonly session: GuestSession,
  ) {}

  static async connect(serverUrl = configuredGameServerUrl): Promise<{
    client: GameServerClient;
    activeGame: ActiveGameResponse | null;
  }> {
    if (!serverUrl) {
      throw new GameServerError(
        "Online play is not configured on this deployment.",
        503,
        "SERVICE_NOT_CONFIGURED",
      );
    }
    let session: GuestSession;
    try {
      session = await readGuestSession(serverUrl);
    } catch (error) {
      if (!(error instanceof GameServerError) || error.status !== 401)
        throw error;
      session = await createGuestSession(serverUrl);
    }
    let client = new GameServerClient(serverUrl, session);
    try {
      return { client, activeGame: await client.getActiveGame() };
    } catch (error) {
      if (!(error instanceof GameServerError) || error.status !== 401)
        throw error;
      clearActiveGame();
      session = await createGuestSession(serverUrl);
      client = new GameServerClient(serverUrl, session);
      return { client, activeGame: null };
    }
  }

  private async authenticatedFetch(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    const response = await fetch(`${this.serverUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
    if (!response.ok) throw await responseError(response);
    return response;
  }

  async getActiveGame(): Promise<ActiveGameResponse | null> {
    const response = await this.authenticatedFetch("/v1/active-game");
    const body = (await response.json()) as {
      activeGame?: { snapshot?: unknown; color?: unknown } | null;
    };
    if (body.activeGame === null) return null;
    const snapshot = gameSnapshotSchema.safeParse(body.activeGame?.snapshot);
    const color = body.activeGame?.color;
    if (!snapshot.success || (color !== "red" && color !== "black")) {
      throw new GameServerError(
        "The game service returned an invalid active game.",
        502,
        "INVALID_RESPONSE",
      );
    }
    return { snapshot: snapshot.data, color };
  }

  async command(command: ClientCommand): Promise<ServerEvent[]> {
    const response = await this.authenticatedFetch("/v1/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
    });
    const body = (await response.json()) as { events?: unknown };
    if (!Array.isArray(body.events)) {
      throw new GameServerError(
        "The game service returned an invalid command result.",
        502,
        "INVALID_RESPONSE",
      );
    }
    return body.events.map((value) => {
      const parsed = serverEventSchema.safeParse(value);
      if (!parsed.success) {
        throw new GameServerError(
          "The game service returned an invalid event.",
          502,
          "INVALID_RESPONSE",
        );
      }
      return parsed.data;
    });
  }

  async issueReconnectToken(gameId: string): Promise<string> {
    const response = await this.authenticatedFetch("/v1/reconnect-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    const body = (await response.json()) as { reconnectToken?: unknown };
    if (typeof body.reconnectToken !== "string") {
      throw new GameServerError(
        "The game service returned an invalid reconnect token.",
        502,
        "INVALID_RESPONSE",
      );
    }
    return body.reconnectToken;
  }

  async reconnect(
    gameId: string,
    token: string,
  ): Promise<{ snapshot: GameSnapshot; reconnectToken: string }> {
    const response = await this.authenticatedFetch("/v1/reconnect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId, token }),
    });
    const body = (await response.json()) as {
      snapshot?: unknown;
      reconnectToken?: unknown;
    };
    const snapshot = gameSnapshotSchema.safeParse(body.snapshot);
    if (!snapshot.success || typeof body.reconnectToken !== "string") {
      throw new GameServerError(
        "The game service returned invalid reconnect state.",
        502,
        "INVALID_RESPONSE",
      );
    }
    return { snapshot: snapshot.data, reconnectToken: body.reconnectToken };
  }

  async disconnect(gameId: string): Promise<void> {
    await this.authenticatedFetch("/v1/disconnect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId }),
      keepalive: true,
    });
  }

  listen(
    onEvent: (event: ServerEvent) => void,
    onStatus: (status: StreamStatus) => void,
    gameId?: string,
  ): () => void {
    let stopped = false;
    let controller: AbortController | null = null;

    const run = async () => {
      let delayMs = 500;
      while (!stopped) {
        onStatus(delayMs === 500 ? "connecting" : "reconnecting");
        controller = new AbortController();
        try {
          const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
          const response = await this.authenticatedFetch(`/v1/events${query}`, {
            signal: controller.signal,
            headers: { accept: "text/event-stream" },
          });
          if (!response.body) {
            throw new GameServerError(
              "The game service did not open an event stream.",
              502,
              "INVALID_RESPONSE",
            );
          }
          onStatus("open");
          delayMs = 500;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (!stopped) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder
              .decode(value, { stream: true })
              .replace(/\r\n/g, "\n");
            let boundary = buffer.indexOf("\n\n");
            while (boundary >= 0) {
              const block = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              const payload = block
                .split("\n")
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trimStart())
                .join("\n");
              if (payload) {
                const parsed = serverEventSchema.safeParse(JSON.parse(payload));
                if (parsed.success) onEvent(parsed.data);
              }
              boundary = buffer.indexOf("\n\n");
            }
          }
        } catch (error) {
          if (
            stopped ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            break;
          }
          if (error instanceof GameServerError && error.status === 401) {
            onStatus("closed");
            break;
          }
        }
        if (!stopped) {
          onStatus("reconnecting");
          await new Promise((resolve) => window.setTimeout(resolve, delayMs));
          delayMs = Math.min(delayMs * 2, 8_000);
        }
      }
    };

    void run();
    return () => {
      stopped = true;
      controller?.abort();
      onStatus("closed");
    };
  }
}
