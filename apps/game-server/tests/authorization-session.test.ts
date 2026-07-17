import { describe, expect, it } from "vitest";
import {
  sanitizeDisplayName,
  SlidingWindowRateLimiter,
} from "../src/authorization.js";
import { InMemoryIdentityRepository } from "../src/repository.js";
import { SessionService } from "../src/session.js";

describe("validation, authorization, and sessions", () => {
  it("normalizes display names and strips control characters", () => {
    expect(sanitizeDisplayName("  Alice\u0000   Example  ")).toBe(
      "Alice Example",
    );
    expect(() => sanitizeDisplayName("x")).toThrow(/2–32/);
  });

  it("enforces sliding-window limits", () => {
    let now = 100;
    const limiter = new SlidingWindowRateLimiter(2, 1_000, () => now);
    limiter.consume("guest");
    limiter.consume("guest");
    expect(() => limiter.consume("guest")).toThrow(/Too many/);
    now += 1_001;
    expect(() => limiter.consume("guest")).not.toThrow();
  });

  it("authenticates signed guest sessions and rejects tampering", async () => {
    const sessions = new SessionService(
      new InMemoryIdentityRepository(),
      "a-session-secret-that-is-at-least-thirty-two-bytes",
    );
    const created = await sessions.createGuest("Guest Player");
    await expect(
      sessions.authenticate(`Bearer ${created.token}`),
    ).resolves.toMatchObject({
      id: created.identity.id,
      kind: "guest",
    });
    await expect(
      sessions.authenticate(`Bearer ${created.token}x`),
    ).rejects.toMatchObject({
      code: "INVALID_SESSION",
    });
  });
});
