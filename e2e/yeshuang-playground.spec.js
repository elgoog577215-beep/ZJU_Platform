import { expect, test } from "@playwright/test";

const profile = {
    id: 280,
    type: "person",
    owner_user_id: 281,
    handle: "user-281",
    display_name: "yeshuang",
    aliases: [],
    stats: { published_count: 1, event_count: 46 },
};

async function openProfile(page, { data = profile, language = "zh", theme = "day" } = {}) {
    await page.addInitScript(
        ({ language, theme }) => {
            localStorage.setItem("i18nextLng", language);
            localStorage.setItem("ui_mode_v3", theme);
        },
        { language, theme }
    );
    await page.route("**/api/**", (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === `/api/profiles/${data.handle}`) return route.fulfill({ json: data });
        if (path.endsWith("/feed")) {
            return route.fulfill({ json: { data: [], pagination: {} } });
        }
        if (path.endsWith("/profile-card")) {
            return route.fulfill({ json: { tags: [], cards: [], social_links: [] } });
        }
        if (path.includes("/auth/")) return route.fulfill({ status: 401, json: {} });
        return route.fulfill({ json: path === "/api/settings" ? {} : [] });
    });
    await page.goto(`/u/${data.handle}`);
    await expect(
        page.getByRole("heading", { name: "yeshuang", exact: true, level: 1 })
    ).toBeVisible();
}

test("Yeshuang scenes, gallery, expressions and motion controls work", async ({ page }) => {
    await openProfile(page);
    const world = page.getByTestId("yeshuang-playground");
    await expect(world).toBeVisible();
    await world.getByRole("button", { name: "下一场雪", exact: true }).click();
    await expect(page.getByTestId("yeshuang-snow")).toBeVisible();
    await world.getByRole("button", { name: "暂停动效", exact: true }).click();
    await expect(world).toHaveAttribute("data-animated", "false");
    await expect(page.getByTestId("yeshuang-snow")).toHaveCount(0);
    await world.getByRole("button", { name: "蓝调墨夜", exact: true }).click();
    await expect(world.locator(".ys-scene-image")).toHaveAttribute("src", /midnight.webp$/);
    for (let index = 0; index < 5; index++) {
        await world.getByRole("button", { name: "戳我一下，切换夜霜表情", exact: true }).click();
    }
    await expect(world.getByRole("status")).toContainText("被你发现了");
    await world.getByRole("button", { name: "角色画廊", exact: true }).click();
    await expect(page.locator("#yeshuang-gallery")).toBeVisible();
    await page.locator("#yeshuang-gallery").getByRole("button", { name: "黑裙侧影" }).click();
    await expect(world.locator(".ys-scene-image")).toHaveAttribute("src", /portrait.webp$/);
    await world.getByRole("button", { name: "角色画廊", exact: true }).click();
    await expect(page.locator("#yeshuang-gallery")).toBeHidden();
});

test("mobile English respects reduced motion and keeps the title clear", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openProfile(page, { language: "en", theme: "dark" });
    const world = page.getByTestId("yeshuang-playground");
    await expect(world).toHaveAttribute("data-animated", "false");
    await world.getByRole("button", { name: "Let it snow", exact: true }).click();
    await expect(page.getByTestId("yeshuang-snow")).toHaveCount(0);
    await expect(world.getByRole("status")).toContainText("snowfall");
    const title = await world.locator(".ys-title").boundingBox();
    const sticker = await world.locator(".ys-sticker-wrap").boundingBox();
    expect(sticker.y + sticker.height).toBeLessThan(title.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        360
    );
});

test("matching names do not enable another account's personal artwork", async ({ page }) => {
    const assets = [];
    page.on("request", (request) => {
        if (request.url().includes("/images/profiles/yeshuang/")) assets.push(request.url());
    });
    await openProfile(page, {
        data: { ...profile, id: 281, owner_user_id: 282, handle: "user-282" },
    });
    await expect(page.getByTestId("yeshuang-playground")).toHaveCount(0);
    expect(assets).toEqual([]);
});
