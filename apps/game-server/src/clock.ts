import type { AuthoritativeClock, Color } from "@xiangqi-arena/shared";
import type { ClockRecord, TimeSource } from "./types.js";

export interface ClockRead {
  authoritative: AuthoritativeClock;
  timedOut: Color | null;
}

function elapsed(clock: ClockRecord, time: TimeSource): number {
  if (clock.running === null) return 0;
  return Math.max(0, time.monotonicMs() - clock.lastStartedMonotonicMs);
}

export function createClock(
  initialMs: number,
  incrementMs: number,
  running: Color,
  time: TimeSource,
): ClockRecord {
  if (!Number.isInteger(initialMs) || initialMs <= 0) {
    throw new RangeError("initialMs must be a positive integer");
  }
  if (!Number.isInteger(incrementMs) || incrementMs < 0) {
    throw new RangeError("incrementMs must be a non-negative integer");
  }
  return {
    redMs: initialMs,
    blackMs: initialMs,
    running,
    lastStartedMonotonicMs: time.monotonicMs(),
    incrementMs,
  };
}

export function readClock(clock: ClockRecord, time: TimeSource): ClockRead {
  let redMs = clock.redMs;
  let blackMs = clock.blackMs;
  const spent = elapsed(clock, time);

  if (clock.running === "red") redMs = Math.max(0, redMs - spent);
  if (clock.running === "black") blackMs = Math.max(0, blackMs - spent);

  const timedOut =
    clock.running === "red" && redMs <= 0
      ? "red"
      : clock.running === "black" && blackMs <= 0
        ? "black"
        : null;

  return {
    authoritative: {
      redMs: Math.round(redMs),
      blackMs: Math.round(blackMs),
      running: timedOut === null ? clock.running : null,
      measuredAt: time.wallTimeMs(),
    },
    timedOut,
  };
}

export function commitMove(
  clock: ClockRecord,
  movingColor: Color,
  time: TimeSource,
): ClockRead {
  if (clock.running !== movingColor) {
    throw new Error(`Clock is not running for ${movingColor}`);
  }

  const read = readClock(clock, time);
  clock.redMs = read.authoritative.redMs;
  clock.blackMs = read.authoritative.blackMs;

  if (read.timedOut !== null) {
    clock.running = null;
    clock.lastStartedMonotonicMs = time.monotonicMs();
    return read;
  }

  if (movingColor === "red") {
    clock.redMs += clock.incrementMs;
    clock.running = "black";
  } else {
    clock.blackMs += clock.incrementMs;
    clock.running = "red";
  }
  clock.lastStartedMonotonicMs = time.monotonicMs();
  return readClock(clock, time);
}

export function stopClock(
  clock: ClockRecord,
  time: TimeSource,
): AuthoritativeClock {
  const read = readClock(clock, time).authoritative;
  clock.redMs = read.redMs;
  clock.blackMs = read.blackMs;
  clock.running = null;
  clock.lastStartedMonotonicMs = time.monotonicMs();
  return { ...read, running: null };
}
