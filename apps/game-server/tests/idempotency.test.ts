import { describe, expect, it } from "vitest";
import { IdempotencyRegistry } from "../src/idempotency.js";

describe("command idempotency", () => {
  it("coalesces concurrent duplicate commands and replays the same result", async () => {
    const registry = new IdempotencyRegistry();
    let executions = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const operation = async () => {
      executions += 1;
      await gate;
      return { version: 4 };
    };
    const first = registry.execute(
      "player-a",
      crypto.randomUUID(),
      "submitMove",
      operation,
    );
    const commandId = crypto.randomUUID();
    const one = registry.execute(
      "player-a",
      commandId,
      "submitMove",
      operation,
    );
    const two = registry.execute(
      "player-a",
      commandId,
      "submitMove",
      operation,
    );
    release();
    const [firstResult, oneResult, twoResult] = await Promise.all([
      first,
      one,
      two,
    ]);
    expect(firstResult.value).toEqual({ version: 4 });
    expect(oneResult).toEqual({ value: { version: 4 }, replayed: false });
    expect(twoResult).toEqual({ value: { version: 4 }, replayed: true });
    expect(executions).toBe(2);
  });

  it("rejects command-id reuse by a different actor", async () => {
    const registry = new IdempotencyRegistry();
    const commandId = crypto.randomUUID();
    await registry.execute("player-a", commandId, "resign", async () => "ok");
    await expect(
      registry.execute("player-b", commandId, "resign", async () => "not-ok"),
    ).rejects.toMatchObject({ code: "COMMAND_ID_REUSE" });
  });
});
