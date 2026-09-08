import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome" });
await fs.mkdir("test-results/model-review", { recursive: true });
try {
  for (const theme of ["light", "dark"]) {
    for (const moving of [false, true]) {
      const width = moving ? 390 : 900;
      const prefix = theme + (moving ? "-walking" : "-sitting");
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
        reducedMotion: moving ? "no-preference" : "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => {
        throw e;
      });
      await page.goto(process.argv[2] || "http://127.0.0.1:3210", {
        waitUntil: "networkidle",
      });
      await page.waitForFunction(
        () => Number(document.querySelector(".pet-target")?.dataset.headX) > 0,
      );
      await page.waitForTimeout(1200);
      if (moving) {
        const before = await page
          .locator(".pet-target")
          .evaluate((e) => ({
            x: Number(e.dataset.x),
            z: Number(e.dataset.z),
          }));
        await page.waitForFunction(
          (before) => {
            const pet = document.querySelector(".pet-target");
            return (
              Math.hypot(
                Number(pet.dataset.x) - before.x,
                Number(pet.dataset.z) - before.z,
              ) > 0.2
            );
          },
          before,
          { timeout: 15000 },
        );
      }
      await page.screenshot({
        path: "test-results/model-review/" + prefix + "-full.png",
      });
      const box = await page.locator(".pet-target").boundingBox();
      const clip = {
        x: Math.max(0, box.x - 60),
        y: Math.max(0, box.y - 60),
        width: Math.min(width - Math.max(0, box.x - 60), box.width + 120),
        height: Math.min(900 - Math.max(0, box.y - 60), box.height + 120),
      };
      await page.screenshot({
        path: "test-results/model-review/" + prefix + "-close.png",
        clip,
      });
      console.log(prefix, box);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
