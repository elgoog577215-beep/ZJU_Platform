import { test, expect } from "@playwright/test";

test("events page keeps the dynamic wallpaper visible behind its content", async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "hardwareConcurrency", {
            configurable: true,
            get: () => 8,
        });
        Object.defineProperty(navigator, "deviceMemory", {
            configurable: true,
            get: () => 8,
        });
    });

    await page.goto("/events");

    const wallpaper = page.locator('[data-dynamic-background="true"]');
    const eventsPage = page.locator(".day-page-theme-events");

    await expect(wallpaper).toBeVisible({ timeout: 5_000 });
    await expect(eventsPage).toBeVisible();
    await expect(eventsPage).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(wallpaper).toHaveCSS("position", "fixed");
});
