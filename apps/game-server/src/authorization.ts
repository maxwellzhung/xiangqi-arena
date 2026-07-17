import type { Color } from "@xiangqi-arena/shared";
import type { PlayerIdentity, StoredGame } from "./types.js";
import { PublicError } from "./errors.js";

export function colorForPlayer(
  game: StoredGame,
  playerId: string,
): Color | null {
  if (game.redPlayer.id === playerId) return "red";
  if (game.blackPlayer.id === playerId) return "black";
  return null;
}

export function requireGameMembership(
  game: StoredGame,
  playerId: string,
): Color {
  const color = colorForPlayer(game, playerId);
  if (!color)
    throw new PublicError(
      "FORBIDDEN",
      "You are not a player in this game.",
      403,
    );
  return color;
}

export function requireRatedEligibility(player: PlayerIdentity): void {
  if (player.kind !== "user") {
    throw new PublicError(
      "RATED_AUTH_REQUIRED",
      "Sign in to join a rated game.",
      403,
    );
  }
}

export function requireExpectedVersion(
  game: StoredGame,
  expectedVersion: number,
): void {
  if (game.version !== expectedVersion) {
    throw new PublicError(
      "STALE_VERSION",
      `Game state changed (expected version ${expectedVersion}, current version ${game.version}).`,
      409,
    );
  }
}

export function sanitizeDisplayName(value: string): string {
  const sanitized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (sanitized.length < 2 || sanitized.length > 32) {
    throw new PublicError(
      "INVALID_DISPLAY_NAME",
      "Display names must be 2–32 characters.",
    );
  }
  return sanitized;
}

export class SlidingWindowRateLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now = () => Date.now(),
  ) {}

  consume(key: string): void {
    const cutoff = this.now() - this.windowMs;
    const recent = (this.attempts.get(key) ?? []).filter(
      (value) => value > cutoff,
    );
    if (recent.length >= this.limit) {
      throw new PublicError(
        "RATE_LIMITED",
        "Too many requests. Please wait and try again.",
        429,
      );
    }
    recent.push(this.now());
    this.attempts.set(key, recent);
  }
}
