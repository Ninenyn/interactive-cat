import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) throw new Error("Usage: node scripts/verify-live.mjs https://your-production-domain");
await fs.mkdir("test-results", { recursive: true });
const reports = [];
for (const [name, browserType] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await browserType.launch(name === "chromium" && process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
  try {
    for (const theme of ["dark", "light"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      assert.equal(response.status(), 200, "The anonymous production page must return HTTP 200");
      await page.waitForFunction(pet => document.querySelector(".room")?.getAttribute("data-companion") === pet && document.querySelector(".room")?.getAttribute("data-behavior") === "idle", theme === "dark" ? "jew" : "bo", { timeout: 15000 });
      assert.match(await page.title(), /Jew & Bo/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator("canvas").count(), 1, "The production 3D renderer must be present");
      await page.locator(".companion-stage").focus();
      await page.keyboard.press("Space");
      await page.waitForFunction(state => document.querySelector(".room")?.getAttribute("data-behavior") === state, theme === "dark" ? "blink" : "happy");
      await page.screenshot({ path: "test-results/live-" + name + "-" + theme + ".png" });
      await page.getByRole("button", { name: theme === "dark" ? "Switch to light mode and meet Bo" : "Switch to dark mode and meet Jew" }).click();
      await page.waitForFunction(pet => document.querySelector(".room")?.getAttribute("data-companion") === pet, theme === "dark" ? "bo" : "jew");
      const resources = await page.evaluate(() => performance.getEntriesByType("resource").map(r => ({ host: new URL(r.name).host, bytes: r.encodedBodySize || 0 })));
      assert.deepEqual(errors, []);
      reports.push({ browser: name, initialTheme: theme, status: response.status(), title: await page.title(), viewport: "390x844", overflow: false, petting: true, themeSwitch: true, consoleErrors: errors, resourceHosts: [...new Set(resources.map(r => r.host))], compressedResourceBytes: resources.reduce((n,r) => n+r.bytes,0) });
      await context.close();
    }
  } finally { await browser.close(); }
}
const report = { url, verifiedAt: new Date().toISOString(), reports };
await fs.writeFile("test-results/live-verification.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
