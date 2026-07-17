import { describe, expect, it } from "vitest";
import { calculateElo, InMemoryRatingLedger } from "../src/elo.js";
import type { StoredGame } from "../src/types.js";

describe("Elo ratings", () => {
  it("uses a configurable K-factor", () => {
    expect(calculateElo(1200, 1200, "red-win", 32)).toMatchObject({
      redAfter: 1216,
      blackAfter: 1184,
      redChange: 16,
      blackChange: -16,
    });
  });

  it("applies a rated completion exactly once", async () => {
    const ledger = new InMemoryRatingLedger();
    const game = {
      id: "rated-game",
      rated: true,
      status: "completed",
      result: "red-win",
      timeControlId: "rapid-10",
      redPlayer: { id: "red", kind: "user" },
      blackPlayer: { id: "black", kind: "user" },
    } as StoredGame;
    const [one, two] = await Promise.all([
      ledger.complete(game),
      ledger.complete(game),
    ]);
    expect(one).toEqual(two);
    expect(ledger.rating("red", "rapid-10")).toBe(1216);
    expect(ledger.rating("black", "rapid-10")).toBe(1184);
  });
});
