import { test, expect } from "@playwright/test";
import { prepare, head, position, openMenu } from "./helpers";
test("the quiet room fits phones, landscape, and desktop with both pets and one corner control", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  for (const [width, height] of [
    [320, 844],
    [390, 844],
    [430, 844],
    [844, 390],
    [1280, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await prepare(page, { reduced: true });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.locator(
        ".room-header,.room-intro,.companion-caption,.quiet-signature",
      ),
    ).toHaveCount(0);
    await expect(page.locator(".room-controls button:visible")).toHaveCount(1);
    for (const pet of ["jew", "bo"] as const) {
      const r = (await page.locator('[data-pet="' + pet + '"]').boundingBox())!;
      expect(r.width).toBeGreaterThan(44);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(width);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y + r.height).toBeLessThanOrEqual(height);
    }
    await page.screenshot({
      path:
        "test-results/" +
        test.info().project.name +
        "-minimal-" +
        width +
        ".png",
    });
  }
  expect(errors).toEqual([]);
});
test("both pets walk, turn, remain separate, and still respond at their new positions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  const before = {
    jew: await position(page, "jew"),
    bo: await position(page, "bo"),
  };
  for (const pet of ["jew", "bo"] as const)
    await expect
      .poll(
        async () => {
          const p = await position(page, pet);
          return Math.hypot(p.x - before[pet].x, p.z - before[pet].z);
        },
        { timeout: 16000 },
      )
      .toBeGreaterThan(0.15);
  const a = await position(page, "jew"),
    b = await position(page, "bo");
  expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(1.44);
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-wandering.png",
  });
  const p = await head(page, "bo");
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-state",
    "happy",
  );
});
test("Jew's pointer play still bites briefly, releases, and observes the cooldown", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { fixedRandom: true });
  const states: string[] = [];
  await page.exposeFunction("observePetState", (state: string) =>
    states.push(state),
  );
  await page.evaluate(() => {
    const pet = document.querySelector('[data-pet="jew"]')!;
    new MutationObserver(() => {
      (
        window as unknown as { observePetState: (s: string) => void }
      ).observePetState(pet.getAttribute("data-state")!);
    }).observe(pet, { attributes: true, attributeFilter: ["data-state"] });
  });
  const p = await head(page, "jew");
  await page.mouse.move(p.x - 20, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 20, p.y, { steps: 2 });
  await page.waitForTimeout(1400);
  await page.mouse.up();
  expect(states).toContain("hunting");
  expect(states).toContain("bite");
  expect(states).toContain("release");
  expect(
    await page.locator("canvas").evaluate((e) => getComputedStyle(e).cursor),
  ).not.toBe("none");
  await page.waitForTimeout(6000);
  states.length = 0;
  await page.locator('[data-pet="jew"]').focus();
  await page.keyboard.press("h");
  await page.waitForTimeout(1500);
  expect(states).not.toContain("bite");
});
test("native touch pets a moving cat, strokes gently, and cancels cleanly", async ({
  page,
  browserName,
  context,
}) => {
  test.skip(
    browserName !== "chromium",
    "Native touch injection uses Chromium CDP; WebKit pointer coverage runs separately.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { fixedRandom: true });
  const cdp = await context.newCDPSession(page),
    p = await head(page, "jew");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [p],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator('[data-pet="jew"]')).toHaveAttribute(
    "data-state",
    "blink",
  );
  const h = await head(page, "jew");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: h.x - 18, y: h.y }],
  });
  for (let i = 1; i <= 8; i++) {
    await page.waitForTimeout(90);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: h.x - 18 + i * 5, y: h.y }],
    });
  }
  await expect(page.locator('[data-pet="jew"]')).toHaveAttribute(
    "data-state",
    "petting",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator('[data-pet="jew"]')).not.toHaveAttribute(
    "data-state",
    "bite",
  );
  await cdp.detach();
});
test("heart notes unfold, save, survive reload, and close with the keyboard", async ({
  page,
}) => {
  test.setTimeout(80000);
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { fixedRandom: true });
  await page.locator('[data-pet="jew"]').focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
  }
  await expect(
    page.getByRole("button", { name: "Open the heart note" }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Open the heart note" }).click();
  await expect(
    page.getByRole("button", { name: "Close heart note" }),
  ).toBeFocused();
  const message = await page.locator(".open-note>p").innerText();
  await page
    .getByRole("button", { name: "Save this note", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unsave this note" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-minimal-note.png",
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".open-note")).toHaveCount(0);
  await page.reload();
  await openMenu(page);
  await page.getByRole("button", { name: /^Heart Notes/ }).click();
  await expect(page.getByRole("dialog")).toContainText(message);
});
test("day and night keep both pets, preferences persist, and reduced motion stops roaming", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { dark: true, reduced: true });
  const before = [await position(page, "jew"), await position(page, "bo")];
  await page.waitForTimeout(2200);
  expect([await position(page, "jew"), await position(page, "bo")]).toEqual(
    before,
  );
  await openMenu(page);
  await page.getByRole("button", { name: "Daylight", exact: true }).click();
  await expect(page.locator(".room")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".room")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator(".room")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".pet-target")).toHaveCount(2);
  await openMenu(page);
  await page.getByRole("button", { name: "Sound Off" }).click();
  await expect(page.getByRole("button", { name: "Sound On" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.locator('[data-pet="bo"]').focus();
  await page.keyboard.press("p");
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-state",
    "paw",
  );
  await page.keyboard.press("b");
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-state",
    "breathing",
  );
});
