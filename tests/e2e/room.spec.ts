import { test, expect } from "@playwright/test";
import { prepare, head, position, openMenu } from "./helpers";

test("the quiet room fits phones, landscape, and desktop with only Bo in daylight", async ({
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
    await expect(page.locator('[data-pet="jew"]')).toHaveCount(0);
    const r = (await page.locator('[data-pet="bo"]').boundingBox())!;
    expect(r.width).toBeGreaterThan(44);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(width);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.y + r.height).toBeLessThanOrEqual(height);
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

test("the visible pet wanders and still responds at its new position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  const before = await position(page, "bo");
  await expect
    .poll(
      async () => {
        const p = await position(page, "bo");
        return Math.hypot(p.x - before.x, p.z - before.z);
      },
      { timeout: 16000 },
    )
    .toBeGreaterThan(0.15);
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-wandering.png",
  });
  const p = await head(page, "bo");
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-state",
    "happy",
  );
});

test("Jew never chases the cursor and nibbles free after a long drag", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { dark: true, fixedRandom: true });
  const states: string[] = [];
  await page.exposeFunction("observePetState", (state: string) => states.push(state));
  await page.evaluate(() => {
    const pet = document.querySelector('[data-pet="jew"]')!;
    new MutationObserver(() => {
      (window as unknown as { observePetState: (s: string) => void }).observePetState(
        pet.getAttribute("data-state")!,
      );
    }).observe(pet, { attributes: true, attributeFilter: ["data-state"] });
  });
  const p = await head(page, "jew"),
    before = await position(page, "jew");
  await page.mouse.move(p.x - 80, p.y - 30);
  await page.mouse.move(p.x + 80, p.y + 30, { steps: 2 });
  await page.waitForTimeout(300);
  expect(states).not.toContain("hunting");

  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 72, p.y + 18, { steps: 6 });
  await expect(page.locator('[data-pet="jew"]')).toHaveAttribute(
    "data-dragging",
    "true",
  );
  await page.waitForTimeout(2300);
  expect(states).not.toContain("hunting");
  expect(states).toContain("bite");
  await expect(page.locator('[data-pet="jew"]')).toHaveAttribute(
    "data-dragging",
    "false",
  );
  const after = await position(page, "jew");
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.05);
  await page.mouse.up();
});

test("Bo can be carried for as long as the user keeps dragging", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { fixedRandom: true });
  const p = await head(page, "bo"),
    before = await position(page, "bo");
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 68, p.y + 18, { steps: 6 });
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-dragging",
    "true",
  );
  await page.waitForTimeout(2800);
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-dragging",
    "true",
  );
  await expect(page.locator('[data-pet="bo"]')).not.toHaveAttribute(
    "data-state",
    "bite",
  );
  await page.mouse.move(p.x - 55, p.y + 28, { steps: 5 });
  const after = await position(page, "bo");
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.05);
  await page.mouse.up();
  await expect(page.locator('[data-pet="bo"]')).toHaveAttribute(
    "data-dragging",
    "false",
  );
});

test("native touch can drag the night cat and cancel cleanly", async ({
  page,
  browserName,
  context,
}) => {
  test.skip(
    browserName !== "chromium",
    "Native touch injection uses Chromium CDP; WebKit pointer coverage runs separately.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { dark: true, fixedRandom: true });
  const cdp = await context.newCDPSession(page),
    p = await head(page, "jew");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [p],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: p.x + 46, y: p.y + 12 }],
  });
  await expect(page.locator('[data-pet="jew"]')).toHaveAttribute(
    "data-dragging",
    "true",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator('[data-pet="jew"]')).toHaveAttribute(
    "data-dragging",
    "false",
  );
  await expect(page.locator('[data-pet="jew"]')).not.toHaveAttribute(
    "data-state",
    "bite",
  );
  await cdp.detach();
});

test("heart notes unfold more often, save, survive reload, and close with the keyboard", async ({
  page,
}) => {
  test.setTimeout(55000);
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { fixedRandom: true });
  await page.locator('[data-pet="bo"]').focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
  }
  await expect(
    page.getByRole("button", { name: "Open the heart note" }),
  ).toBeVisible({ timeout: 35000 });
  await page.getByRole("button", { name: "Open the heart note" }).click();
  await expect(
    page.getByRole("button", { name: "Close heart note" }),
  ).toBeFocused();
  await expect(page.locator(".note-top")).toContainText("From Bo");
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

test("night shows only Jew, daylight shows only Bo, and the saved theme persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, { dark: true, reduced: true });
  await expect(page.locator('[data-pet="jew"]')).toHaveCount(1);
  await expect(page.locator('[data-pet="bo"]')).toHaveCount(0);
  const before = await position(page, "jew");
  await page.waitForTimeout(2200);
  expect(await position(page, "jew")).toEqual(before);

  await openMenu(page);
  await page.getByRole("button", { name: "Daylight", exact: true }).click();
  await expect(page.locator(".room")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".room")).toHaveAttribute("data-companion", "bo");
  await expect(page.locator('[data-pet="jew"]')).toHaveCount(0);
  await expect(page.locator('[data-pet="bo"]')).toHaveCount(1);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".room")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator(".room")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('[data-pet="jew"]')).toHaveCount(0);
  await expect(page.locator('[data-pet="bo"]')).toHaveCount(1);

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
