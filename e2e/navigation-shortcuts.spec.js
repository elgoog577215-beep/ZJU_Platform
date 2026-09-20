import { test, expect } from "@playwright/test";

async function setup(page, state, { authenticated = true, failSave = false } = {}) {
    await page.addInitScript(
        ({ authenticated }) => {
            localStorage.setItem("i18nextLng", "zh");
            localStorage.setItem("ui_mode_v3", "day");
            if (authenticated) sessionStorage.setItem("token", "test-navigation-token");
        },
        { authenticated }
    );
    await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/auth/me")
            return route.fulfill({ json: { id: 77, username: "NavigationFixture", role: "user" } });
        if (path === "/api/users/me/navigation-shortcuts") {
            if (route.request().method() === "PUT") {
                if (failSave) return route.fulfill({ status: 503, json: { error: "unavailable" } });
                const body = route.request().postDataJSON();
                if (body.version !== state.version)
                    return route.fulfill({ status: 409, json: { error: "conflict" } });
                state.links = body.links;
                state.version++;
            }
            return route.fulfill({ json: state });
        }
        return route.fulfill({ json: {} });
    });
}

test("shortcuts form a standalone row and account edits persist across clients", async ({
    page,
    browser,
}) => {
    const state = { links: null, version: 0 };
    await setup(page, state);
    await page.goto("/");
    const shortcuts = page.getByRole("region", { name: "常用直达" });
    await expect(shortcuts).toBeVisible();
    expect(await page.locator(".directory-search-area .directory-shortcuts").count()).toBe(0);
    await shortcuts.getByRole("button", { name: "自定义", exact: true }).click();
    await page.getByRole("button", { name: "移除 GitHub", exact: true }).click();
    await page.getByLabel("从网站目录添加").fill("Figma");
    await page
        .locator(".directory-shortcut-candidates")
        .getByRole("button", { name: "Figma", exact: true })
        .click();
    await page.getByLabel("网站名称", { exact: true }).fill("我的工作台");
    await page
        .getByLabel("网站地址", { exact: true })
        .fill("https://example.com/private?space=mine");
    await page.getByRole("button", { name: "添加", exact: true }).click();
    await page.getByRole("button", { name: "上移 我的工作台", exact: true }).click();
    await page
        .locator("#shortcut-editor")
        .screenshot({ path: "output/playwright/navigation-customize-desktop.png" });
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("已保存到账号", { exact: true })).toBeVisible();
    expect(state.links.at(-2).name).toBe("我的工作台");
    await page.reload();
    await expect(shortcuts.getByRole("link", { name: "我的工作台", exact: true })).toBeVisible();
    const second = await browser.newContext();
    const otherPage = await second.newPage();
    await setup(otherPage, state);
    await otherPage.goto("http://localhost:5180/");
    await expect(
        otherPage
            .getByRole("region", { name: "常用直达" })
            .getByRole("link", { name: "我的工作台", exact: true })
    ).toBeVisible();
    await second.close();
    await page.getByRole("button", { name: "退出登录", exact: true }).click();
    await expect(shortcuts.getByRole("link", { name: "我的工作台", exact: true })).toHaveCount(0);
    await expect(shortcuts.getByRole("link", { name: "GitHub", exact: true })).toBeVisible();
});

test("save failure keeps edits; cancel, empty list and reset are deliberate", async ({ page }) => {
    const state = { links: [{ name: "Private", url: "https://example.com/" }], version: 1 };
    await setup(page, state, { failSave: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "自定义", exact: true }).click();
    await page.getByRole("button", { name: "移除 Private", exact: true }).click();
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("保存失败");
    await expect(page.getByText("已选 0 / 12")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
    );
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await expect(
        page
            .getByRole("region", { name: "常用直达" })
            .getByRole("link", { name: "Private", exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "自定义", exact: true }).click();
    await page.getByRole("button", { name: "恢复默认", exact: true }).click();
    await expect(page.getByText("已选 8 / 12")).toBeVisible();
    expect(state.links).toHaveLength(1);
    await page
        .locator("#shortcut-editor")
        .screenshot({ path: "output/playwright/navigation-customize-mobile.png" });
});

test("guest customization opens the existing login dialog", async ({ page }) => {
    await setup(page, { links: null, version: 0 }, { authenticated: false });
    await page.goto("/");
    await page.getByRole("button", { name: "自定义", exact: true }).click();
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
});
