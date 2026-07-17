import type { GameResult } from "@xiangqi-arena/shared";
import type { StoredGame } from "./types.js";

export interface EloResult {
  redBefore: number;
  blackBefore: number;
  redAfter: number;
  blackAfter: number;
  redChange: number;
  blackChange: number;
}

export function calculateElo(
  redRating: number,
  blackRating: number,
  result: GameResult,
  kFactor = 32,
): EloResult {
  if (
    ![redRating, blackRating, kFactor].every(Number.isFinite) ||
    kFactor <= 0
  ) {
    throw new RangeError(
      "Ratings and K-factor must be finite; K-factor must be positive",
    );
  }
  const expectedRed = 1 / (1 + 10 ** ((blackRating - redRating) / 400));
  const actualRed = result === "red-win" ? 1 : result === "black-win" ? 0 : 0.5;
  const redChange = Math.round(kFactor * (actualRed - expectedRed));
  return {
    redBefore: redRating,
    blackBefore: blackRating,
    redAfter: Math.max(0, redRating + redChange),
    blackAfter: Math.max(0, blackRating - redChange),
    redChange,
    blackChange: -redChange,
  };
}

export interface RatingLedger {
  complete(game: StoredGame): Promise<EloResult | null>;
  rating(playerId: string, mode: string): number;
}

export class InMemoryRatingLedger implements RatingLedger {
  private readonly ratings = new Map<string, number>();
  private readonly completedGames = new Map<string, EloResult>();
  private readonly inFlight = new Map<string, Promise<EloResult | null>>();

  constructor(
    private readonly kFactor = 32,
    private readonly initialRating = 1200,
  ) {}

  rating(playerId: string, mode: string): number {
    return this.ratings.get(`${mode}:${playerId}`) ?? this.initialRating;
  }

  async complete(game: StoredGame): Promise<EloResult | null> {
    if (!game.rated || !game.result || game.status !== "completed") return null;
    const existing = this.completedGames.get(game.id);
    if (existing) return existing;
    const pending = this.inFlight.get(game.id);
    if (pending) return pending;

    const operation = Promise.resolve().then(() => {
      const mode = game.timeControlId;
      const redBefore = this.rating(game.redPlayer.id, mode);
      const blackBefore = this.rating(game.blackPlayer.id, mode);
      const result = calculateElo(
        redBefore,
        blackBefore,
        game.result!,
        this.kFactor,
      );
      this.ratings.set(`${mode}:${game.redPlayer.id}`, result.redAfter);
      this.ratings.set(`${mode}:${game.blackPlayer.id}`, result.blackAfter);
      this.completedGames.set(game.id, result);
      return result;
    });
    this.inFlight.set(game.id, operation);
    try {
      return await operation;
    } finally {
      this.inFlight.delete(game.id);
    }
  }
}
