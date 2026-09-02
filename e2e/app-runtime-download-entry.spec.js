import { expect, test } from "@playwright/test";

const APP_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 14; Mobile; wv) AppleWebKit/537.36 " +
    "Chrome/124.0.0.0 Mobile Safari/537.36 TuotuZjuApp/8";

test("regular web keeps the App download entries", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/about");

    await expect(page.locator('a[href="/download"]')).toHaveCount(2);
});

test("installed App runtime hides download entries and blocks the download route", async ({
    browser,
}) => {
    const context = await browser.newContext({
        baseURL: "http://localhost:5180",
        userAgent: APP_USER_AGENT,
        viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto("/about");
    await expect(page.locator('a[href="/download"]')).toHaveCount(0);

    await page.locator('nav[role="navigation"] button[aria-expanded]:not([aria-haspopup])').click();
    const moreDialog = page.getByRole("dialog");
    await expect(moreDialog).toBeVisible();
    await expect(moreDialog.locator('a[href="/download"]')).toHaveCount(0);

    await page.goto("/download");
    await expect(page).toHaveURL("http://localhost:5180/");

    await context.close();
});
