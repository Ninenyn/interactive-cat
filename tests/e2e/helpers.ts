import { expect, type Page } from "@playwright/test";
export async function prepare(
  page: Page,
  options: { dark?: boolean; reduced?: boolean; fixedRandom?: boolean } = {},
) {
  const pet = options.dark ? "jew" : "bo";
  await page.emulateMedia({
    colorScheme: options.dark ? "dark" : "light",
    reducedMotion: options.reduced ? "reduce" : "no-preference",
  });
  if (options.fixedRandom)
    await page.addInitScript(() => {
      Math.random = () => 0.1;
    });
  else
    await page.addInitScript(() => {
      let seed = 4831;
      Math.random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator(".room")).toHaveAttribute("data-companion", pet);
  await expect(page.locator(".pet-target")).toHaveCount(1);
  await expect(page.locator(`[data-pet="${pet}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-pet="${pet === "jew" ? "bo" : "jew"}"]`)).toHaveCount(0);
  await expect
    .poll(async () =>
      page
        .locator(".pet-target")
        .evaluate((e) =>
          Number.isFinite(Number((e as HTMLElement).dataset.headX)) &&
          Number((e as HTMLElement).dataset.headX) > 0,
        ),
    )
    .toBe(true);
  await expect(page.locator(`[data-pet="${pet}"]`)).not.toHaveAttribute(
    "data-state",
    "entering",
  );
}
export async function head(page: Page, pet: "jew" | "bo") {
  return page
    .locator('[data-pet="' + pet + '"]')
    .evaluate((e) => ({
      x: Number((e as HTMLElement).dataset.headX),
      y: Number((e as HTMLElement).dataset.headY),
    }));
}
export async function position(page: Page, pet: "jew" | "bo") {
  return page
    .locator('[data-pet="' + pet + '"]')
    .evaluate((e) => ({
      x: Number((e as HTMLElement).dataset.x),
      z: Number((e as HTMLElement).dataset.z),
    }));
}
export async function openMenu(page: Page) {
  await page
    .getByRole("button", { name: "Room settings", exact: true })
    .click();
}
