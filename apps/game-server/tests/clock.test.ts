import { describe, expect, it } from "vitest";
import { commitMove, createClock, readClock, stopClock } from "../src/clock.js";
import type { TimeSource } from "../src/types.js";

class FakeTime implements TimeSource {
  monotonic = 1_000;
  wall = 10_000;

  monotonicMs() {
    return this.monotonic;
  }

  wallTimeMs() {
    return this.wall;
  }

  advance(ms: number) {
    this.monotonic += ms;
    this.wall += ms;
  }
}

describe("authoritative clock", () => {
  it("charges only the running side and applies increment after a move", () => {
    const time = new FakeTime();
    const clock = createClock(60_000, 1_000, "red", time);
    time.advance(2_500);
    const result = commitMove(clock, "red", time);
    expect(result.timedOut).toBeNull();
    expect(result.authoritative).toMatchObject({
      redMs: 58_500,
      blackMs: 60_000,
      running: "black",
    });
    expect(result.authoritative.measuredAt).toBe(12_500);
  });

  it("adjudicates timeout from monotonic elapsed time", () => {
    const time = new FakeTime();
    const clock = createClock(1_000, 0, "red", time);
    time.advance(1_001);
    expect(readClock(clock, time)).toMatchObject({
      timedOut: "red",
      authoritative: { redMs: 0, blackMs: 1_000, running: null },
    });
    expect(commitMove(clock, "red", time).timedOut).toBe("red");
  });

  it("freezes both sides when stopped", () => {
    const time = new FakeTime();
    const clock = createClock(5_000, 0, "red", time);
    time.advance(500);
    expect(stopClock(clock, time)).toMatchObject({
      redMs: 4_500,
      blackMs: 5_000,
      running: null,
    });
    time.advance(5_000);
    expect(readClock(clock, time).authoritative.redMs).toBe(4_500);
  });
});
