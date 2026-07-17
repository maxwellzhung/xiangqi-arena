import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { PublicError } from "./errors.js";

interface ReconnectRecord {
  gameId: string;
  playerId: string;
  tokenHash: string;
  expiresAt: number;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashesEqual(first: string, second: string): boolean {
  const a = Buffer.from(first, "hex");
  const b = Buffer.from(second, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reconnect tokens are opaque, hashed at rest, single-use, and rotated. */
export class ReconnectionTokens {
  private readonly records = new Map<string, ReconnectRecord>();

  constructor(
    private readonly ttlMs = 24 * 60 * 60_000,
    private readonly now = () => Date.now(),
  ) {}

  issue(gameId: string, playerId: string): string {
    const token = randomBytes(32).toString("base64url");
    this.records.set(`${gameId}:${playerId}`, {
      gameId,
      playerId,
      tokenHash: hashToken(token),
      expiresAt: this.now() + this.ttlMs,
    });
    return token;
  }

  rotate(gameId: string, playerId: string, token: string): string {
    const key = `${gameId}:${playerId}`;
    const record = this.records.get(key);
    if (
      !record ||
      record.expiresAt <= this.now() ||
      !hashesEqual(record.tokenHash, hashToken(token))
    ) {
      throw new PublicError(
        "INVALID_RECONNECT_TOKEN",
        "The reconnect token is invalid or expired.",
        401,
      );
    }
    return this.issue(gameId, playerId);
  }
}

interface PresenceRecord {
  connected: boolean;
  lastSeenAt: number;
  graceEndsAt: number | null;
}

export class PresenceService {
  private readonly records = new Map<string, PresenceRecord>();

  constructor(
    private readonly graceMs = 30_000,
    private readonly now = () => Date.now(),
  ) {}

  connected(gameId: string, playerId: string): void {
    this.records.set(`${gameId}:${playerId}`, {
      connected: true,
      lastSeenAt: this.now(),
      graceEndsAt: null,
    });
  }

  heartbeat(gameId: string, playerId: string): void {
    const key = `${gameId}:${playerId}`;
    const record = this.records.get(key);
    if (record) record.lastSeenAt = this.now();
  }

  disconnected(gameId: string, playerId: string): number {
    const graceEndsAt = this.now() + this.graceMs;
    this.records.set(`${gameId}:${playerId}`, {
      connected: false,
      lastSeenAt: this.now(),
      graceEndsAt,
    });
    return graceEndsAt;
  }
}
