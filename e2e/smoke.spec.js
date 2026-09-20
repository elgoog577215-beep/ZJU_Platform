import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("i18nextLng", "zh");
        localStorage.setItem("ui_mode_v3", "dark");
    });
});

test("homepage stays available and only exposes public directory URLs", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "探索 AI，从这里开始。" })).toBeVisible();
    await expect(page).toHaveTitle(/AI 与科技导航/);
    await expect(page.locator(".directory-group")).toHaveCount(9);
    await expect(page.locator(".directory-group li")).toHaveCount(69);
    await page.waitForTimeout(3200); // Regression: the former splash redirected after 3 seconds.
    await expect(page).toHaveURL(/\/$/);
    const links = await page
        .locator('.ai-directory a[target="_blank"]')
        .evaluateAll((nodes) => nodes.map((node) => ({ href: node.href, rel: node.rel })));
    for (const link of links) {
        const url = new URL(link.href);
        expect(url.protocol).toBe("https:");
        expect(url.search).toBe("");
        expect(url.hash).toBe("");
        expect(url.username).toBe("");
        expect(link.rel).toContain("noopener");
        expect(link.rel).toContain("noreferrer");
        expect(url.pathname).not.toMatch(/\/u\/\d|\/notebook\/|\/mail\//);
    }
    expect(errors).toEqual([]);
});

test("search, empty recovery and category URL restoration", async ({ page }) => {
    await page.goto("/");
    const input = page.getByRole("searchbox", { name: "搜索导航网站" });
    await input.fill("Hugging Face");
    await expect(page.locator(".directory-group li")).toHaveCount(3);
    await page.reload();
    await expect(input).toHaveValue("Hugging Face");
    await input.fill("不存在的网站-no-match");
    await expect(page.getByRole("heading", { name: "还没有找到匹配的网站" })).toBeVisible();
    await page.locator(".directory-empty").getByRole("button", { name: "浏览全部网站" }).click();
    await page.getByRole("button", { name: "论文与科研", exact: true }).click();
    await expect(page).toHaveURL(/category=research/);
    await expect(page.locator(".directory-group")).toHaveCount(1);
    await page.getByRole("button", { name: "模型与数据集", exact: true }).click();
    await page.goBack();
    await expect(page.getByRole("button", { name: "论文与科研", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true"
    );
    await expect(page.locator(".directory-group li")).toHaveCount(9);
});

test("internal navigation and back preserve the directory without reloading", async ({ page }) => {
    let loads = 0;
    page.on("load", () => loads++);
    await page.goto("/?category=learning");
    await page.locator(".directory-main-nav").getByRole("link", { name: "项目广场" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.goBack();
    await expect(page).toHaveURL(/category=learning/);
    await expect(page.locator(".directory-group")).toHaveCount(1);
    expect(loads).toBe(1);
});

test("theme, keyboard search and English work at narrow widths", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "切换浅色模式" }).click();
    await expect(page.locator(".ai-directory")).toHaveAttribute("data-appearance", "day");
    await page.getByRole("button", { name: "Switch to English" }).click();
    await expect(page.getByRole("heading", { name: "Your starting point for AI." })).toBeVisible();
    await page.keyboard.press("/");
    await expect(page.getByRole("searchbox", { name: "Search directory" })).toBeFocused();
    await page.keyboard.type("ZJU Course Guide");
    await expect(page.locator(".directory-group li")).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Search directory" }).fill("python");
    await expect(page.locator(".directory-group li")).toHaveCount(4);
    await page.keyboard.press("Escape");
    await expect(page.locator(".directory-group li")).toHaveCount(69);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
    );
});
