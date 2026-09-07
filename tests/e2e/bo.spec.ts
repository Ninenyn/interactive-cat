import { test, expect } from "@playwright/test";
test("Bo plays, relaxes on hold, and digs up his own note on a phone", async ({
  page,
}) => {
  test.setTimeout(80000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    Math.random = () => 0.1;
  });
  await page.goto("/");
  await expect(page.locator(".room")).toHaveAttribute("data-companion", "bo");
  await expect(page.locator(".room")).toHaveAttribute("data-behavior", "idle");
  const stage = page.locator(".companion-stage");
  await stage.focus();
  await page.keyboard.press("h");
  await expect(page.locator(".room")).toHaveAttribute("data-behavior", "boop");
  await page.waitForTimeout(1800);
  await stage.focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
  }
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await expect(page.locator(".room")).toHaveAttribute(
    "data-behavior",
    "breathing",
  );
  await page.mouse.up();
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-bo-mobile.png",
  });
  await expect(
    page.getByRole("button", { name: "Open the heart note" }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Open the heart note" }).click();
  await expect(page.locator(".note-top")).toContainText("FROM BO");
  await expect(
    page.getByRole("button", { name: "Close heart note" }),
  ).toBeFocused();
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-bo-note.png",
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".open-note")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
