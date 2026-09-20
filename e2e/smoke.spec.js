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
    await expect(page.getByRole("heading", { name: "好用的网站，从这里开始。" })).toBeVisible();
    await expect(page).toHaveTitle(/常用网站导航/);
    await expect(page.locator(".directory-group")).toHaveCount(15);
    await expect(page.locator(".directory-group li")).toHaveCount(123);
    await expect(page.getByRole("menubar", { name: "导航菜单" }).getByRole("menuitem")).toHaveText([
        "首页",
        "活动聚合",
        "AI社区",
        "浙客松",
        "生态介绍",
    ]);
    await expect(page.locator("footer")).toHaveCount(1);
    await expect(page.locator(".directory-shortcuts")).toHaveCount(0);
    const sizes = await page
        .locator(".directory-group")
        .evaluateAll((groups) => groups.map((group) => group.querySelectorAll("li").length));
    expect(sizes.every((size) => size <= 9)).toBe(true);
    const background = await page
        .locator(".ecosystem-landscape-shell")
        .evaluate((node) => getComputedStyle(node, "::before").backgroundImage);
    expect(background).toContain("hero-landscape-night.jpg");
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
    const office = page.getByRole("region", { name: "办公与演示 15", exact: true });
    await expect(office.locator("li")).toHaveCount(9);
    await page.getByRole("button", { name: "查看全部：办公与演示", exact: true }).click();
    await expect(office.locator("li")).toHaveCount(15);
    await expect(page).toHaveURL(/expanded=office/);
    await expect(page.locator(".directory-group")).toHaveCount(15);
    await page.reload();
    await expect(office.locator("li")).toHaveCount(15);
    await page.goBack();
    await expect(office.locator("li")).toHaveCount(9);
    await page.goForward();
    await expect(office.locator("li")).toHaveCount(15);
    await page.getByRole("button", { name: "收起：办公与演示", exact: true }).click();
    await expect(office.locator("li")).toHaveCount(9);
    await input.fill("办公");
    await expect(office.locator("li")).toHaveCount(15);
    await input.fill("Hugging Face");
    await expect(page.locator(".directory-group li")).toHaveCount(3);
    await page.reload();
    await expect(input).toHaveValue("Hugging Face");
    await input.fill("不存在的网站-no-match");
    await expect(page.getByRole("heading", { name: "还没有找到匹配的网站" })).toBeVisible();
    await page.locator(".directory-empty").getByRole("button", { name: "浏览全部网站" }).click();
    await expect(page.locator(".directory-filters")).toHaveCount(0);
    await page.goto("/?category=research");
    await expect(page.locator(".directory-group li")).toHaveCount(15);
    await page.getByRole("button", { name: "浏览全部网站", exact: true }).click();
    await expect(page.locator(".directory-group li")).toHaveCount(123);
    await input.fill("浙大本科");
    await expect(page.locator(".directory-group li")).toHaveCount(1);
    await expect(page.locator(".directory-group a")).toHaveAttribute(
        "href",
        "https://zdbk.zju.edu.cn/"
    );
    await input.fill("ETA");
    await expect(page.locator(".directory-group a")).toHaveAttribute(
        "href",
        "https://eta.zju.edu.cn/"
    );
});

test("internal navigation and back preserve the directory without reloading", async ({ page }) => {
    let loads = 0;
    page.on("load", () => loads++);
    await page.goto("/?category=learning");
    await page
        .getByRole("menubar", { name: "导航菜单" })
        .getByRole("menuitem", { name: "活动聚合" })
        .click();
    await expect(page).toHaveURL(/\/events$/);
    await page.goBack();
    await expect(page).toHaveURL(/category=learning/);
    await expect(page.locator(".directory-group")).toHaveCount(1);
    expect(loads).toBe(1);
});

test("theme, keyboard search and English work at narrow widths", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const bottomNav = page.getByRole("navigation", { name: "移动端底部导航" });
    await expect(bottomNav.getByRole("link")).toHaveCount(4);
    await expect(bottomNav.getByRole("button", { name: "我的", exact: true })).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: "首页", exact: true })).toHaveAttribute(
        "aria-current",
        "page"
    );
    await page.getByRole("button", { name: "更多", exact: true }).click();
    await page.getByRole("button", { name: "白天模式", exact: true }).click();
    await expect(page.locator(".ai-directory")).toHaveAttribute("data-appearance", "day");
    await expect(page.locator(".ecosystem-landscape-shell")).toHaveCount(0);
    await page
        .getByRole("dialog", { name: "更多" })
        .getByRole("button", { name: "切换语言" })
        .click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await page
        .getByRole("dialog", { name: "More" })
        .getByRole("button", { name: "Close", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Your everyday starting point." })
    ).toBeVisible();
    await page.keyboard.press("/");
    await expect(page.getByRole("searchbox", { name: "Search directory" })).toBeFocused();
    await page.keyboard.type("ZJU Course Guide");
    await expect(page.locator(".directory-group li")).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Search directory" }).fill("python");
    await expect(page.locator(".directory-group li")).toHaveCount(4);
    await page.keyboard.press("Escape");
    await expect(page.locator(".directory-group li")).toHaveCount(123);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
    );
});
