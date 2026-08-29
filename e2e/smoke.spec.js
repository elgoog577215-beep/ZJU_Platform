import { test, expect } from "@playwright/test";

test("home splash holds for three seconds and enters without a page reload", async ({ page }) => {
    const startupErrors = [];
    let loadCount = 0;
    page.on("load", () => {
        loadCount += 1;
    });
    page.on("console", (message) => {
        if (/Failed to fetch dynamically imported module|HomeSplash-.*\.js/i.test(message.text())) {
            startupErrors.push(message.text());
        }
    });
    page.on("pageerror", (error) => {
        if (/Failed to fetch dynamically imported module|HomeSplash-.*\.js/i.test(error.message)) {
            startupErrors.push(error.message);
        }
    });

    const splashStartedAt = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/拓浙AI生态/);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("欢迎来到拓浙AI生态")).toHaveCount(0);
    await expect(page.getByText("先发现一个值得参与的机会")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "直接进入" })).toBeVisible();

    await expect(page).toHaveURL(/\/events$/, { timeout: 4500 });
    expect(Date.now() - splashStartedAt).toBeGreaterThanOrEqual(2900);
    await expect(page.getByRole("link", { name: /拓浙AI生态首页/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "活动集合", level: 2 })).toBeVisible();
    expect(loadCount).toBe(1);
    expect(startupErrors).toEqual([]);
});

test("home splash can be skipped without a page reload", async ({ page }) => {
    let loadCount = 0;
    page.on("load", () => {
        loadCount += 1;
    });

    const splashStartedAt = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "直接进入" }).click();

    await expect(page).toHaveURL(/\/events$/);
    expect(Date.now() - splashStartedAt).toBeLessThan(3000);
    expect(loadCount).toBe(1);
});
