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
});
