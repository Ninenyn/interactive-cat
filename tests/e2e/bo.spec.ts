import { test, expect } from "@playwright/test";
import { prepare, head } from "./helpers";
test("Bo boops, relaxes on hold, and finds his own note alongside Jew", async ({
  page,
}) => {
  test.setTimeout(80000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { fixedRandom: true });
  await page.locator('[data-pet="bo"]').focus();
  await page.keyboard.press("h");
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-state",
    "boop",
  );
  await page.waitForTimeout(1700);
  const h = await head(page, "bo");
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  await page.waitForTimeout(850);
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-state",
    "breathing",
  );
  await page.mouse.up();
  await page.locator('[data-pet="bo"]').focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
  }
  await expect(
    page.getByRole("button", { name: "Open the heart note" }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Open the heart note" }).click();
  await expect(page.locator(".note-top")).toContainText("From Bo");
  await expect(page.locator('[data-pet="jew"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".open-note")).toHaveCount(0);
  expect(errors).toEqual([]);
});
