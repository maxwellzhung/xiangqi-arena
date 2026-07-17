import { expect, test } from "@playwright/test";

test("guest can start a guided game and make a legal move", async ({
  page,
}) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "Start local game" }).click();
  const soldier = page.getByRole("gridcell", {
    name: /red Soldier, coordinate a3/i,
  });
  await expect(soldier).toBeEnabled();
  await soldier.click();
  await expect(
    page.getByRole("gridcell", { name: /coordinate a4.*legal destination/i }),
  ).toBeVisible();
  await page
    .getByRole("gridcell", { name: /coordinate a4.*legal destination/i })
    .click();
  await expect(page.getByText("Soldier a3-a4", { exact: true })).toBeVisible();
});

test("guided board explains an illegal move with a specific rule", async ({
  page,
}) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "Start local game" }).click();
  const horse = page.getByRole("gridcell", {
    name: /red Horse, coordinate b0/i,
  });
  await expect(horse).toBeEnabled();
  await horse.click();
  await page
    .getByRole("gridcell", { name: /Empty intersection, coordinate b1/i })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Horse moves one intersection straight",
  );
});

test("board supports roving arrow-key navigation", async ({ page }) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "Start local game" }).click();
  const general = page.getByRole("gridcell", {
    name: /red General, coordinate e0/i,
  });
  await expect(general).toBeEnabled();
  await general.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("gridcell", { name: /red Advisor, coordinate d0/i }),
  ).toBeFocused();
});

test("important navigation remains keyboard operable", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  const learnLink = page.getByRole("link", { name: "Learn", exact: true });
  if ((await learnLink.count()) === 0) {
    const menuButton = page.getByRole("button", { name: "Menu" });
    await expect(menuButton).toBeEnabled();
    await menuButton.focus();
    await page.keyboard.press("Enter");
    await expect(learnLink).toBeVisible();
  }
  await learnLink.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /familiar strategy/i }),
  ).toBeVisible();
});
