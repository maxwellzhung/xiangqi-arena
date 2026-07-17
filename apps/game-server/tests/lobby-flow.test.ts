import { describe, expect, it } from "vitest";
import type { PlayerIdentity, TimeSource } from "../src/types.js";
import { InMemoryRatingLedger } from "../src/elo.js";
import { xiangqiRulesEngine } from "../src/engine-adapter.js";
import { GameService } from "../src/game-service.js";
import { MatchmakingService } from "../src/matchmaking-service.js";
import { InMemoryGameRepository } from "../src/repository.js";
import { PrivateRoomService } from "../src/room-service.js";

const time: TimeSource = { monotonicMs: () => 0, wallTimeMs: () => 0 };
const player = (
  id: string,
  kind: "guest" | "user" = "guest",
): PlayerIdentity => ({
  id,
  kind,
  displayName: id,
  rating: 1200,
});

describe("rooms and matchmaking", () => {
  it("creates a six-character private room and joins exactly one opponent", async () => {
    const games = new GameService(
      new InMemoryGameRepository(),
      xiangqiRulesEngine,
      new InMemoryRatingLedger(),
      time,
    );
    const rooms = new PrivateRoomService(games, "https://play.example.test");
    const created = await rooms.create(player("owner"), "rapid-10");
    expect(created.roomCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(created.joinUrl).toContain(created.roomCode);
    const joined = await rooms.join(player("joiner"), created.roomCode);
    expect(joined.match.game.status).toBe("active");
    await expect(
      rooms.join(player("third"), created.roomCode),
    ).rejects.toMatchObject({
      code: "ROOM_UNAVAILABLE",
    });
  });

  it("matches compatible queues, prevents duplicates, and requires accounts for rated play", async () => {
    const games = new GameService(
      new InMemoryGameRepository(),
      xiangqiRulesEngine,
      new InMemoryRatingLedger(),
      time,
    );
    const matchmaking = new MatchmakingService(
      games,
      () => 1_000,
      () => true,
    );
    const first = player("first", "user");
    expect(await matchmaking.join(first, "blitz-5", true)).toMatchObject({
      matched: false,
    });
    await expect(
      matchmaking.join(first, "blitz-5", true),
    ).rejects.toMatchObject({
      code: "ALREADY_QUEUED",
    });
    const second = await matchmaking.join(
      player("second", "user"),
      "blitz-5",
      true,
    );
    expect(second).toMatchObject({
      matched: true,
      match: { game: { rated: true } },
    });
    await expect(
      matchmaking.join(player("guest"), "blitz-5", true),
    ).rejects.toMatchObject({
      code: "RATED_AUTH_REQUIRED",
    });
  });
});
