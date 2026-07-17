import { expect, test } from "@playwright/test";

test("guest can start a guided game and make a legal move", async ({
  page,
}) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "Start local game" }).click();
  const soldier = page.getByRole("gridcell", {
    name: /red Soldier, coordinate a3/i,
  });
  await soldier.click();
  await expect(
    page.getByRole("gridcell", { name: /coordinate a4.*legal destination/i }),
  ).toBeVisible();
  await page
    .getByRole("gridcell", { name: /coordinate a4.*legal destination/i })
    .click();
  await expect(page.getByText("Soldier a3-a4")).toBeVisible();
});

test("guided board explains an illegal move with a specific rule", async ({
  page,
}) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "Start local game" }).click();
  await page
    .getByRole("gridcell", { name: /red Horse, coordinate b0/i })
    .click();
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
  await page.getByRole("link", { name: "Learn" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /familiar strategy/i }),
  ).toBeVisible();
});
