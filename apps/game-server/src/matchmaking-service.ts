import { randomInt, randomUUID } from "node:crypto";
import type { TimeControlId } from "@xiangqi-arena/shared";
import { requireRatedEligibility } from "./authorization.js";
import { PublicError } from "./errors.js";
import type { GameService } from "./game-service.js";
import type { MatchCreated, PlayerIdentity } from "./types.js";

interface QueueEntry {
  id: string;
  player: PlayerIdentity;
  timeControlId: TimeControlId;
  rated: boolean;
  rating: number;
  joinedAt: number;
  lastHeartbeatAt: number;
}

export type MatchmakingResult =
  | { matched: false; entryId: string }
  | { matched: true; match: MatchCreated; opponent: PlayerIdentity };

export class MatchmakingService {
  private readonly queue = new Map<string, QueueEntry>();
  private readonly entryByPlayer = new Map<string, string>();

  constructor(
    private readonly games: GameService,
    private readonly now = () => Date.now(),
    private readonly chooseFirstAsRed = () => randomInt(0, 2) === 0,
    private readonly disconnectTimeoutMs = 45_000,
  ) {}

  async join(
    player: PlayerIdentity,
    timeControlId: TimeControlId,
    rated: boolean,
  ): Promise<MatchmakingResult> {
    this.removeDisconnected();
    if (rated) requireRatedEligibility(player);
    if (this.entryByPlayer.has(player.id)) {
      throw new PublicError(
        "ALREADY_QUEUED",
        "You are already in matchmaking.",
        409,
      );
    }

    const joinedAt = this.now();
    const candidate: QueueEntry = {
      id: randomUUID(),
      player,
      timeControlId,
      rated,
      rating: player.rating,
      joinedAt,
      lastHeartbeatAt: joinedAt,
    };
    const opponent = [...this.queue.values()]
      .filter(
        (entry) =>
          entry.timeControlId === timeControlId &&
          entry.rated === rated &&
          this.ratingsCompatible(entry, candidate),
      )
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];

    if (!opponent) {
      this.queue.set(candidate.id, candidate);
      this.entryByPlayer.set(player.id, candidate.id);
      return { matched: false, entryId: candidate.id };
    }

    this.queue.delete(opponent.id);
    this.entryByPlayer.delete(opponent.player.id);
    const firstIsRed = this.chooseFirstAsRed();
    const red = firstIsRed ? opponent.player : player;
    const black = firstIsRed ? player : opponent.player;
    try {
      const match = await this.games.createGame(
        red,
        black,
        timeControlId,
        rated,
        "matchmaking",
      );
      return { matched: true, match, opponent: opponent.player };
    } catch (error) {
      this.queue.set(opponent.id, opponent);
      this.entryByPlayer.set(opponent.player.id, opponent.id);
      throw error;
    }
  }

  leave(playerId: string): boolean {
    const entryId = this.entryByPlayer.get(playerId);
    if (!entryId) return false;
    this.entryByPlayer.delete(playerId);
    return this.queue.delete(entryId);
  }

  heartbeat(playerId: string): void {
    const entryId = this.entryByPlayer.get(playerId);
    const entry = entryId ? this.queue.get(entryId) : null;
    if (entry) entry.lastHeartbeatAt = this.now();
  }

  removeDisconnected(): number {
    const cutoff = this.now() - this.disconnectTimeoutMs;
    let removed = 0;
    for (const entry of this.queue.values()) {
      if (entry.lastHeartbeatAt <= cutoff) {
        this.queue.delete(entry.id);
        this.entryByPlayer.delete(entry.player.id);
        removed += 1;
      }
    }
    return removed;
  }

  private ratingsCompatible(first: QueueEntry, second: QueueEntry): boolean {
    if (!first.rated) return true;
    const firstRange = this.ratingRange(first.joinedAt);
    const secondRange = this.ratingRange(second.joinedAt);
    return (
      Math.abs(first.rating - second.rating) <=
      Math.max(firstRange, secondRange)
    );
  }

  private ratingRange(joinedAt: number): number {
    const secondsWaiting = Math.max(0, this.now() - joinedAt) / 1_000;
    return Math.min(600, 100 + Math.floor(secondsWaiting / 10) * 25);
  }
}
