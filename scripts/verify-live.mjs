import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url))
  throw new Error(
    "Usage: node scripts/verify-live.mjs https://your-production-domain",
  );
await fs.mkdir("test-results", { recursive: true });
const reports = [];
for (const [name, browserType] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await browserType.launch(
    name === "chromium" && process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {},
  );
  try {
    for (const theme of ["dark", "light"]) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme: theme,
      });
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      assert.equal(
        response.status(),
        200,
        "Anonymous access must return HTTP 200",
      );
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll(".pet-target")].length === 2 &&
          [...document.querySelectorAll(".pet-target")].every(
            (e) =>
              Number.isFinite(Number(e.dataset.headX)) &&
              Number(e.dataset.headX) > 0 &&
              e.dataset.state !== "entering",
          ),
        undefined,
        { timeout: 15000 },
      );
      assert.match(await page.title(), /Jew & Bo/);
      assert.equal(
        await page.locator(".room").getAttribute("data-companion"),
        "both",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.equal(await page.locator("canvas").count(), 1);
      await page.screenshot({
        path: "test-results/live-" + name + "-" + theme + ".png",
      });
      const initial = await page
        .locator(".pet-target")
        .evaluateAll((items) =>
          items.map((e) => ({
            x: Number(e.dataset.x),
            z: Number(e.dataset.z),
          })),
        );
      await page.waitForFunction(
        (before) =>
          [...document.querySelectorAll(".pet-target")].some(
            (e, i) =>
              Math.hypot(
                Number(e.dataset.x) - before[i].x,
                Number(e.dataset.z) - before[i].z,
              ) > 0.15,
          ),
        initial,
        { timeout: 15000 },
      );
      for (const pet of ["jew", "bo"]) {
        await page.locator('[data-pet="' + pet + '"]').focus();
        await page.keyboard.press("Space");
        await page.waitForFunction(
          ({ pet, state }) =>
            document
              .querySelector('[data-pet="' + pet + '"]')
              ?.getAttribute("data-state") === state,
          { pet, state: pet === "jew" ? "blink" : "happy" },
        );
      }
      await page
        .getByRole("button", { name: "Room settings", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: theme === "dark" ? "Daylight" : "Moonlight",
          exact: true,
        })
        .click();
      assert.equal(
        await page.locator(".room").getAttribute("data-theme"),
        theme === "dark" ? "light" : "dark",
      );
      assert.equal(await page.locator(".pet-target").count(), 2);
      const resources = await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .map((r) => ({
            host: new URL(r.name).host,
            bytes: r.encodedBodySize || 0,
          })),
      );
      assert.deepEqual(errors, []);
      reports.push({
        browser: name,
        initialTheme: theme,
        status: response.status(),
        title: await page.title(),
        viewport: "390x844",
        bothPets: true,
        overflow: false,
        wandering: true,
        pettingBoth: true,
        themeSwitch: true,
        consoleErrors: errors,
        resourceHosts: [...new Set(resources.map((r) => r.host))],
        compressedResourceBytes: resources.reduce((n, r) => n + r.bytes, 0),
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
const report = { url, verifiedAt: new Date().toISOString(), reports };
await fs.writeFile(
  "test-results/live-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
