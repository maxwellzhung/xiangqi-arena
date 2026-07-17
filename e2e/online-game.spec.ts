import { expect, test } from "@playwright/test";

test("two guests complete an authoritative private game and open its replay", async ({
  browser,
  page: owner,
}) => {
  await owner.goto("/play");
  const createRoom = owner.getByRole("button", { name: "Create room" });
  await expect(createRoom).toBeEnabled({ timeout: 20_000 });
  await createRoom.click();

  const roomResult = owner.locator(".room-result");
  await expect(roomResult).toBeVisible();
  const inviteUrl = (await roomResult.locator("code").textContent())?.trim();
  expect(inviteUrl).toMatch(/\/game\/[A-Z2-9]{6}$/);

  const guestContext = await browser.newContext({
    viewport: owner.viewportSize() ?? { width: 1280, height: 720 },
  });
  const guest = await guestContext.newPage();
  try {
    await guest.goto(inviteUrl!);
    await expect(
      guest.getByRole("heading", { name: "Live Xiangqi game" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      owner.getByRole("heading", { name: "Live Xiangqi game" }),
    ).toBeVisible({ timeout: 20_000 });

    await owner
      .getByRole("gridcell", { name: /red Soldier, coordinate a3/i })
      .click();
    await owner
      .getByRole("gridcell", {
        name: /Empty intersection, coordinate a4.*legal destination/i,
      })
      .click();
    await expect(guest.getByText("Soldier a3-a4")).toBeVisible({
      timeout: 10_000,
    });

    await guest
      .getByRole("gridcell", { name: /black Soldier, coordinate a6/i })
      .click();
    await guest
      .getByRole("gridcell", {
        name: /Empty intersection, coordinate a5.*legal destination/i,
      })
      .click();
    await expect(owner.getByText("Soldier a6-a5")).toBeVisible({
      timeout: 10_000,
    });

    const authoritativeState = await owner.evaluate(async () => {
      const active = await fetch("/api/v1/active-game", {
        credentials: "include",
      }).then((response) => response.json());
      const snapshot = active.activeGame.snapshot;
      const response = await fetch("/api/v1/commands", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "submitMove",
          commandId: crypto.randomUUID(),
          gameId: snapshot.gameId,
          expectedVersion: 0,
          move: {
            from: { column: 2, row: 6 },
            to: { column: 2, row: 5 },
          },
        }),
      });
      return response.json();
    });
    expect(authoritativeState.events[0]).toMatchObject({
      type: "moveRejected",
      snapshot: { version: 2, moveSequence: 2 },
    });

    const clockBefore = await owner
      .locator(".practice-clock")
      .last()
      .textContent();
    await owner.waitForTimeout(1_100);
    const clockAfter = await owner
      .locator(".practice-clock")
      .last()
      .textContent();
    expect(clockBefore).toMatch(/^\d+:\d{2}$/);
    expect(clockAfter).toMatch(/^\d+:\d{2}$/);

    await owner.reload();
    await expect(owner.getByText("Soldier a6-a5")).toBeVisible({
      timeout: 20_000,
    });
    await expect(owner.locator(".practice-note")).toContainText(
      /Connected|server-authoritative/i,
    );

    guest.once("dialog", (dialog) => void dialog.accept());
    await guest.getByRole("button", { name: "Resign" }).click();
    await expect(guest.getByText(/You lost by resignation/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(owner.getByText(/You won by resignation/i)).toBeVisible({
      timeout: 10_000,
    });

    await owner.getByRole("link", { name: "Review this game" }).click();
    await expect(
      owner.getByRole("heading", { name: "Review the turning points" }),
    ).toBeVisible();
    await expect(owner.getByText("Soldier a3-a4")).toBeVisible({
      timeout: 10_000,
    });
    await expect(owner.getByText(/red win by resignation/i)).toBeVisible();

    await owner.goto("/profile");
    await expect(
      owner.getByRole("heading", { name: "Your saved games" }),
    ).toBeVisible();
    await expect(owner.getByText("Win", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(owner.getByRole("link", { name: "Replay" })).toBeVisible();
  } finally {
    await guestContext.close();
  }
});
