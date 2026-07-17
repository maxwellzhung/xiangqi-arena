import { describe, expect, it } from "vitest";
import type { PlayerIdentity, TimeSource } from "../src/types.js";
import { InMemoryRatingLedger } from "../src/elo.js";
import { xiangqiRulesEngine } from "../src/engine-adapter.js";
import { GameService } from "../src/game-service.js";
import { InMemoryGameRepository } from "../src/repository.js";

class FakeTime implements TimeSource {
  value = 1_000;
  monotonicMs() {
    return this.value;
  }
  wallTimeMs() {
    return this.value;
  }
  advance(ms: number) {
    this.value += ms;
  }
}

const red: PlayerIdentity = {
  id: "red-player",
  kind: "guest",
  displayName: "Red",
  rating: 1200,
};
const black: PlayerIdentity = {
  id: "black-player",
  kind: "guest",
  displayName: "Black",
  rating: 1200,
};

function setup() {
  const repository = new InMemoryGameRepository();
  const time = new FakeTime();
  const games = new GameService(
    repository,
    xiangqiRulesEngine,
    new InMemoryRatingLedger(),
    time,
  );
  return { repository, time, games };
}

describe("authoritative game flow", () => {
  it("accepts a legal move once and rejects stale or illegal moves", async () => {
    const { games } = setup();
    const match = await games.createGame(
      red,
      black,
      "blitz-5",
      false,
      "private",
    );
    const accepted = await games.submitMove(red.id, {
      type: "submitMove",
      commandId: crypto.randomUUID(),
      gameId: match.game.id,
      expectedVersion: 0,
      move: { from: { column: 0, row: 6 }, to: { column: 0, row: 5 } },
    });
    expect(accepted.event).toMatchObject({
      type: "moveAccepted",
      snapshot: { version: 1, moveSequence: 1, currentTurn: "black" },
    });

    const stale = await games.submitMove(black.id, {
      type: "submitMove",
      commandId: crypto.randomUUID(),
      gameId: match.game.id,
      expectedVersion: 0,
      move: { from: { column: 0, row: 3 }, to: { column: 0, row: 4 } },
    });
    expect(stale.event).toMatchObject({
      type: "moveRejected",
      snapshot: { version: 1 },
    });

    const illegal = await games.submitMove(black.id, {
      type: "submitMove",
      commandId: crypto.randomUUID(),
      gameId: match.game.id,
      expectedVersion: 1,
      move: { from: { column: 0, row: 3 }, to: { column: 0, row: 2 } },
    });
    expect(illegal.event.type).toBe("moveRejected");
    expect((await games.getSnapshot(match.game.id, red.id)).moveSequence).toBe(
      1,
    );
  });

  it("adjudicates timeout without trusting a client clock", async () => {
    const { games, time } = setup();
    const match = await games.createGame(
      red,
      black,
      "blitz-5",
      false,
      "private",
    );
    time.advance(5 * 60_000 + 1);
    const snapshot = await games.getSnapshot(match.game.id, red.id);
    expect(snapshot).toMatchObject({
      status: "completed",
      result: "black-win",
      terminationReason: "timeout",
      clock: { redMs: 0, running: null },
    });
  });

  it("supports draw agreement and resignation", async () => {
    const { games } = setup();
    const drawGame = await games.createGame(
      red,
      black,
      "rapid-10",
      false,
      "private",
    );
    await games.offerDraw(red.id, {
      type: "offerDraw",
      commandId: crypto.randomUUID(),
      gameId: drawGame.game.id,
      expectedVersion: 0,
    });
    const draw = await games.respondToDraw(black.id, {
      type: "respondToDraw",
      commandId: crypto.randomUUID(),
      gameId: drawGame.game.id,
      expectedVersion: 0,
      accept: true,
    });
    expect(draw.event).toMatchObject({
      type: "gameEnded",
      snapshot: { result: "draw", terminationReason: "draw-agreement" },
    });

    const resignationGame = await games.createGame(
      red,
      black,
      "rapid-10",
      false,
      "private",
    );
    const resignation = await games.resign(red.id, {
      type: "resign",
      commandId: crypto.randomUUID(),
      gameId: resignationGame.game.id,
      expectedVersion: 0,
    });
    expect(resignation.event).toMatchObject({
      type: "gameEnded",
      snapshot: { result: "black-win", terminationReason: "resignation" },
    });
  });

  it("creates a rematch with colors reversed", async () => {
    const { games } = setup();
    const original = await games.createGame(
      red,
      black,
      "classic-15-10",
      false,
      "private",
    );
    await games.resign(red.id, {
      type: "resign",
      commandId: crypto.randomUUID(),
      gameId: original.game.id,
      expectedVersion: 0,
    });
    await games.requestRematch(red.id, {
      type: "requestRematch",
      commandId: crypto.randomUUID(),
      gameId: original.game.id,
      expectedVersion: 1,
    });
    const response = await games.respondToRematch(black.id, {
      type: "respondToRematch",
      commandId: crypto.randomUUID(),
      gameId: original.game.id,
      expectedVersion: 1,
      accept: true,
    });
    expect(response.rematch?.game).toMatchObject({
      redPlayer: { id: black.id },
      blackPlayer: { id: red.id },
      timeControlId: "classic-15-10",
    });
  });
});
