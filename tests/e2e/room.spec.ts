import { test, expect, type Page } from "@playwright/test";
async function prepare(page: Page, dark = true) {
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
  await page.addInitScript(() => {
    Math.random = () => 0.1;
  });
  await page.goto("/");
  await expect(page.locator(".room")).toHaveAttribute(
    "data-companion",
    dark ? "jew" : "bo",
  );
  await expect(page.locator(".room")).toHaveAttribute("data-behavior", "idle", {
    timeout: 10000,
  });
}
async function openMenu(page: Page) {
  await page
    .getByRole("button", { name: "Room settings", exact: true })
    .click();
}
test("all required phone sizes and desktop fit; theme and keyboard controls work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await prepare(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Room settings", exact: true }),
    ).toBeVisible();
    const targets = await page
      .locator("button:visible")
      .evaluateAll((buttons) =>
        buttons.map((b) => {
          const r = b.getBoundingClientRect();
          return { width: r.width, height: r.height };
        }),
      );
    expect(targets.every((r) => r.width >= 44 && r.height >= 44)).toBe(true);
    await page.screenshot({
      path:
        "test-results/" + test.info().project.name + "-dark-" + width + ".png",
    });
  }
  const stage = page.locator(".companion-stage");
  await stage.focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".room")).toHaveAttribute("data-behavior", "blink");
  await page
    .getByRole("button", { name: "Switch to light mode and meet Bo" })
    .click();
  await expect(page.locator(".room")).toHaveAttribute("data-companion", "bo");
  await expect(page.locator(".room")).toHaveAttribute("data-behavior", "idle");
  await stage.focus();
  await page.keyboard.press("p");
  await expect(page.locator(".room")).toHaveAttribute("data-behavior", "paw");
  await page.reload();
  await expect(page.locator(".room")).toHaveAttribute("data-companion", "bo");
  expect(errors).toEqual([]);
});
test("pointer play produces a short bite and recovers without hiding the cursor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  const states: string[] = [];
  await page.exposeFunction("observeState", (state: string) =>
    states.push(state),
  );
  await page.evaluate(() => {
    new MutationObserver(() => {
      const state = document
        .querySelector(".room")
        ?.getAttribute("data-behavior");
      if (state)
        (
          window as unknown as { observeState: (s: string) => void }
        ).observeState(state);
    }).observe(document.querySelector(".room")!, {
      attributes: true,
      attributeFilter: ["data-behavior"],
    });
  });
  const box = (await page.locator(".companion-stage").boundingBox())!,
    cx = box.x + box.width / 2,
    cy = box.y + box.height * 0.4;
  await page.mouse.move(cx - 40, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 45, cy + 10, { steps: 3 });
  await page.waitForTimeout(1300);
  await page.mouse.up();
  expect(states).toContain("hunting");
  expect(states).toContain("bite");
  expect(states).toContain("release");
  expect(
    await page
      .locator("canvas")
      .first()
      .evaluate((e) => getComputedStyle(e).cursor),
  ).not.toBe("none");
  await page.waitForTimeout(6000);
  states.length = 0;
  await page.mouse.move(cx - 45, cy);
  await page.mouse.move(cx + 45, cy, { steps: 2 });
  await page.waitForTimeout(1500);
  expect(states).not.toContain("bite");
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-play.png",
  });
});
test("notes emerge, unfold, save, and survive reload; sound and reduced motion work", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 375, height: 812 });
  await prepare(page);
  const stage = page.locator(".companion-stage");
  await stage.focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(150);
  }
  await expect(
    page.getByRole("button", { name: "Open the heart note" }),
  ).toBeVisible({ timeout: 65000 });
  await page.getByRole("button", { name: "Open the heart note" }).click();
  await expect(page.getByRole("region", { name: "Heart note" })).toBeVisible();
  const message = await page.locator(".open-note>p").innerText();
  await page
    .getByRole("button", { name: "Save this note", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unsave this note" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-heart-note.png",
  });
  await page.getByRole("button", { name: "Close heart note" }).click();
  await page.reload();
  await openMenu(page);
  await page.getByRole("button", { name: /^Heart Notes/ }).click();
  await expect(page.getByRole("dialog")).toContainText(message);
  await page.getByRole("button", { name: "Close panel" }).click();
  await openMenu(page);
  await page.getByRole("button", { name: "Sound Off" }).click();
  await expect(page.getByRole("button", { name: "Sound On" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".room")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
  await page.locator(".companion-stage").focus();
  await page.keyboard.press("b");
  await expect(page.locator(".room")).toHaveAttribute(
    "data-behavior",
    "breathing",
  );
});
test("OS light theme follows system until manually overridden", async ({
  page,
}) => {
  await prepare(page, false);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".room")).toHaveAttribute("data-companion", "jew");
  await page
    .getByRole("button", { name: "Switch to light mode and meet Bo" })
    .click();
  await expect(page.locator(".room")).toHaveAttribute("data-companion", "bo");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(900);
  await expect(page.locator(".room")).toHaveAttribute("data-companion", "bo");
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-bo.png",
  });
});
test("actual mobile touch can tap, stroke, and cancel a drag", async ({
  page,
  browserName,
  context,
}) => {
  test.skip(
    browserName !== "chromium",
    "Chromium CDP supplies native touch movement; WebKit pointer handling is covered above.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  const box = (await page.locator(".companion-stage").boundingBox())!,
    x = box.x + box.width / 2,
    y = box.y + box.height * 0.38;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".room")).toHaveAttribute("data-behavior", "blink");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: x - 30, y }],
  });
  for (let i = 1; i <= 8; i++) {
    await page.waitForTimeout(90);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - 30 + i * 7, y }],
    });
  }
  await expect(page.locator(".room")).toHaveAttribute(
    "data-behavior",
    "petting",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await cdp.detach();
});
