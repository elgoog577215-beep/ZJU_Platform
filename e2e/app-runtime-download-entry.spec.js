import { expect, test } from "@playwright/test";

const APP_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 14; Mobile; wv) AppleWebKit/537.36 " +
    "Chrome/124.0.0.0 Mobile Safari/537.36 TuotuZjuApp/8";

test("regular web keeps the App download entries", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/about");

    await expect(page.locator('a[href="/download"]')).toHaveCount(2);
});

test("browser install events never open an App installation prompt", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.evaluate(() => {
        window.dispatchEvent(new Event("beforeinstallprompt", { cancelable: true }));
    });

    await expect(page.getByRole("status").filter({ hasText: /安装|install/i })).toHaveCount(0);
    await expect(page.getByText("安装拓浙AI生态 App")).toHaveCount(0);
});

test("mobile web hides download entries and blocks download routes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/about");
    await expect(page).toHaveURL("http://localhost:5180/about");
    await expect(page.locator("#about-hero")).toBeVisible();
    await expect(page.locator('a[href="/download"]')).toHaveCount(0);

    await page.locator('nav[role="navigation"] button[aria-expanded]:not([aria-haspopup])').click();
    const moreDialog = page.getByRole("dialog");
    await expect(moreDialog).toBeVisible();
    await expect(moreDialog.locator('a[href="/download"]')).toHaveCount(0);
    await expect(moreDialog.locator('a[href="/hackathon"]:visible')).toBeVisible();
    await expect(moreDialog.locator('a[href="/about"]:visible')).toHaveAttribute(
        "aria-current",
        "page"
    );

    await page.goto("/download");
    await expect(page).toHaveURL("http://localhost:5180/");

    await page.goto("/app");
    await expect(page).toHaveURL("http://localhost:5180/");
});

test("phone navigation restores About and all event pages without changing retired routes", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const openMore = () =>
        page.locator('nav[role="navigation"] button[aria-expanded]:not([aria-haspopup])').click();
    await openMore();
    await page.getByRole("dialog").locator('a[href="/about"]:visible').click();
    await expect(page.locator("#about-hero")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await openMore();
    await page.getByRole("dialog").locator('a[href="/hackathon"]:visible').click();
    await expect(page.locator(".hx-workspace")).toBeVisible();

    for (const edition of ["1", "2", "getui-beauty"]) {
        for (const view of ["intro", "challenges", "media", "results", "lottery"]) {
            const path = `/hackathon/${edition}${view === "intro" ? "" : `/${view}`}`;
            await page.goto(path);
            await expect(page).toHaveURL(`http://localhost:5180${path}`);
            await expect(page.locator(`.hx-workspace[data-view="${view}"]`)).toBeVisible();
            await expect(page.locator(".hx-eventbar")).toBeVisible();
        }
    }
    await page.goto("/about/partners");
    await expect(page).toHaveURL("http://localhost:5180/about/partners");
    await expect(page.locator("main h1")).toBeVisible();
    await page.goto("/hackathon/1/register");
    await expect(page.locator('.hx-status-page[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL("http://localhost:5180/hackathon/1/register");
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
    await expect(page).toHaveURL("http://localhost:5180/about");
    await expect(page.locator('a[href="/download"]')).toHaveCount(0);

    await page.locator('nav[role="navigation"] button[aria-expanded]:not([aria-haspopup])').click();
    const moreDialog = page.getByRole("dialog");
    await expect(moreDialog).toBeVisible();
    await expect(moreDialog.locator('a[href="/download"]')).toHaveCount(0);

    await page.goto("/download");
    await expect(page).toHaveURL("http://localhost:5180/");

    await context.close();
});
