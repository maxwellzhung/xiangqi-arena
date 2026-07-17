import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createGameServer } from "../src/server.js";

const running: Array<ReturnType<typeof createGameServer>["server"]> = [];

afterEach(async () => {
  await Promise.all(
    running
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

describe("health and readiness", () => {
  it("reports liveness and dependency readiness", async () => {
    const application = createGameServer({
      host: "127.0.0.1",
      port: 0,
      sessionSecret: "a-session-secret-that-is-at-least-thirty-two-bytes",
      publicWebOrigin: "http://localhost:3000",
      allowedOrigins: new Set(["http://localhost:3000"]),
    });
    running.push(application.server);
    await new Promise<void>((resolve) =>
      application.server.listen(0, "127.0.0.1", resolve),
    );
    const port = (application.server.address() as AddressInfo).port;
    const [health, ready] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/healthz`).then((response) =>
        response.json(),
      ),
      fetch(`http://127.0.0.1:${port}/readyz`).then((response) =>
        response.json(),
      ),
    ]);
    expect(health).toMatchObject({ status: "ok" });
    expect(ready).toMatchObject({
      status: "ready",
      checks: { gameStore: "ok" },
    });
  });

  it("uses an HttpOnly guest cookie for a real two-player room", async () => {
    const origin = "http://localhost:3000";
    const application = createGameServer({
      host: "127.0.0.1",
      port: 0,
      sessionSecret: "a-session-secret-that-is-at-least-thirty-two-bytes",
      publicWebOrigin: origin,
      allowedOrigins: new Set([origin]),
      secureCookies: true,
    });
    running.push(application.server);
    await new Promise<void>((resolve) =>
      application.server.listen(0, "127.0.0.1", resolve),
    );
    const port = (application.server.address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}`;

    async function guest(displayName: string) {
      const response = await fetch(`${base}/v1/guest-sessions`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ displayName }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(response.status).toBe(201);
      expect(body).not.toHaveProperty("accessToken");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Lax");
      expect(setCookie).toContain("Secure");
      expect(response.headers.get("access-control-allow-credentials")).toBe(
        "true",
      );
      return setCookie.split(";", 1)[0]!;
    }

    async function command(cookie: string, payload: unknown) {
      const response = await fetch(`${base}/v1/commands`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
          origin,
        },
        body: JSON.stringify(payload),
      });
      expect(response.status).toBe(200);
      return (await response.json()) as {
        events: Array<Record<string, unknown>>;
      };
    }

    const ownerCookie = await guest("Room Owner");
    const joinerCookie = await guest("Room Guest");
    const me = await fetch(`${base}/v1/me`, {
      headers: { cookie: ownerCookie, origin },
    });
    expect(await me.json()).toMatchObject({
      player: { kind: "guest", displayName: "Room Owner" },
    });

    const created = await command(ownerCookie, {
      type: "createPrivateRoom",
      commandId: crypto.randomUUID(),
      timeControlId: "rapid-10",
      rated: false,
    });
    const room = created.events.find((event) => event.type === "roomCreated")!;
    expect(room.joinUrl).toBe(`${origin}/game/${room.roomCode}?join=1`);

    const joined = await command(joinerCookie, {
      type: "joinPrivateRoom",
      commandId: crypto.randomUUID(),
      roomCode: room.roomCode,
    });
    expect(joined.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "roomJoined", color: "black" }),
        expect.objectContaining({
          type: "stateSnapshot",
          snapshot: expect.objectContaining({
            status: "active",
            timeControlId: "rapid-10",
            redPlayer: expect.objectContaining({ displayName: "Room Owner" }),
            blackPlayer: expect.objectContaining({ displayName: "Room Guest" }),
          }),
        }),
      ]),
    );
  });
});
