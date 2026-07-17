import { expect, test } from "@playwright/test";

test("guest can start a guided game and make a legal move", async ({
  page,
}) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "Start local game" }).click();
  const soldier = page.getByRole("gridcell", {
    name: /red Soldier, file A, rank 4/i,
  });
  await soldier.click();
  await expect(
    page.getByRole("gridcell", { name: /file A, rank 5.*legal destination/i }),
  ).toBeVisible();
  await page
    .getByRole("gridcell", { name: /file A, rank 5.*legal destination/i })
    .click();
  await expect(page.getByText("Soldier a3-a4")).toBeVisible();
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
