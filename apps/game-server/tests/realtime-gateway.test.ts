import { describe, expect, it } from "vitest";
import { SlidingWindowRateLimiter } from "../src/authorization.js";
import { InMemoryRatingLedger } from "../src/elo.js";
import { xiangqiRulesEngine } from "../src/engine-adapter.js";
import { EventHub } from "../src/events.js";
import { GameService } from "../src/game-service.js";
import { IdempotencyRegistry } from "../src/idempotency.js";
import { MatchmakingService } from "../src/matchmaking-service.js";
import { RealtimeGateway } from "../src/realtime-gateway.js";
import { InMemoryGameRepository } from "../src/repository.js";
import { PrivateRoomService } from "../src/room-service.js";
import type { PlayerIdentity, TimeSource } from "../src/types.js";

const time: TimeSource = { monotonicMs: () => 1_000, wallTimeMs: () => 1_000 };
const identity = (id: string): PlayerIdentity => ({
  id,
  kind: "guest",
  displayName: id,
  rating: 1200,
});

describe("realtime gateway", () => {
  it("replays a duplicate result to its sender without rebroadcasting to the opponent", async () => {
    const games = new GameService(
      new InMemoryGameRepository(),
      xiangqiRulesEngine,
      new InMemoryRatingLedger(),
      time,
    );
    const events = new EventHub();
    const gateway = new RealtimeGateway(
      games,
      new PrivateRoomService(games, "https://play.example.test"),
      new MatchmakingService(games),
      new IdempotencyRegistry(),
      events,
      new SlidingWindowRateLimiter(100, 60_000),
      new SlidingWindowRateLimiter(100, 60_000),
      new SlidingWindowRateLimiter(100, 60_000),
    );
    const owner = identity("owner-player");
    const joiner = identity("joiner-player");
    const createCommand = {
      type: "createPrivateRoom" as const,
      commandId: crypto.randomUUID(),
      timeControlId: "blitz-5" as const,
      rated: false as const,
    };
    const firstCreate = await gateway.handle(owner, createCommand);
    const secondCreate = await gateway.handle(owner, createCommand);
    expect(secondCreate).toEqual(firstCreate);
    const roomCode =
      firstCreate[0]?.type === "roomCreated" ? firstCreate[0].roomCode : "";

    const joined = await gateway.handle(joiner, {
      type: "joinPrivateRoom",
      commandId: crypto.randomUUID(),
      roomCode,
    });
    const gameId = joined[0]?.type === "roomJoined" ? joined[0].gameId : "";
    const opponentEvents: string[] = [];
    events.subscribe(joiner.id, (event) => opponentEvents.push(event.type));
    const move = {
      type: "submitMove" as const,
      commandId: crypto.randomUUID(),
      gameId,
      expectedVersion: 0,
      move: { from: { column: 0, row: 6 }, to: { column: 0, row: 5 } },
    };
    const accepted = await gateway.handle(owner, move);
    const replayed = await gateway.handle(owner, move);
    expect(replayed).toEqual(accepted);
    expect(opponentEvents).toEqual(["moveAccepted"]);
  });
});
