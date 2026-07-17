import { describe, expect, it } from "vitest";
import { PresenceService, ReconnectionTokens } from "../src/presence.js";

describe("presence and reconnection", () => {
  it("rotates opaque reconnect tokens and rejects the previous token", () => {
    const tokens = new ReconnectionTokens();
    const first = tokens.issue("game-12345", "player-a");
    const second = tokens.rotate("game-12345", "player-a", first);
    expect(second).not.toBe(first);
    expect(() => tokens.rotate("game-12345", "player-a", first)).toThrow(
      /invalid or expired/,
    );
  });

  it("starts a deterministic disconnect grace period", () => {
    const presence = new PresenceService(30_000, () => 5_000);
    expect(presence.disconnected("game-12345", "player-a")).toBe(35_000);
  });
});
