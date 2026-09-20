import { test, expect } from "@playwright/test";

for (const [width, theme] of [
    [1440, "day"],
    [390, "dark"],
]) {
    test(`activity search expands in place at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((mode) => {
            localStorage.setItem("i18nextLng", "zh");
            localStorage.setItem("ui_mode_v3", mode);
        }, theme);
        let request;
        let fail = true;
        await page.route("**/api/events/assistant", async (route) => {
            request = route.request().postDataJSON();
            await route.fulfill({
                status: fail ? 503 : 200,
                contentType: "application/json",
                body: JSON.stringify(
                    fail
                        ? { error: "EVENT_ASSISTANT_UNAVAILABLE" }
                        : {
                              type: "empty",
                              scope: "upcoming",
                              recommendations: [],
                              emptyReason: "no_upcoming",
                          }
                ),
            });
        });
        await page.goto("/events");
        const toggle = page.getByRole("button", { name: "AI 搜索", exact: true });
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(page.getByRole("button", { name: "最新发布", exact: true })).toHaveCount(0);
        await expect(
            page.locator("nav").getByRole("button", { name: "AI 搜索", exact: true })
        ).toHaveCount(0);
        const college =
            width === 390
                ? page.getByRole("button", { name: "打开学院筛选" })
                : page.getByRole("button", { name: /我的学院：/ });
        await college.click();
        await page.getByPlaceholder("搜索学院 / 学园").fill("人工智能");
        await page.getByRole("button", { name: "人工智能学院", exact: true }).click();
        if (width === 390) await page.getByRole("button", { name: "完成", exact: true }).click();
        await expect(college).toContainText("人工智能学院");
        await toggle.click();
        const panel = page.locator("#event-ai-search");
        const input = panel.getByRole("textbox", { name: "用一句话找活动" });
        await expect(input).toBeFocused();
        await input.fill("推荐人工智能讲座");
        await panel.getByRole("button", { name: "开始推荐" }).click();
        await expect(page.getByText("活动 AI 助手暂时不可用。", { exact: true })).toBeVisible();
        await expect(input).toHaveValue("推荐人工智能讲座");
        expect(request.query).toContain("人工智能学院");
        fail = false;
        await panel.getByRole("button", { name: "开始推荐" }).click();
        await expect(input).toHaveValue("");
        await expect(panel.getByText("当前暂无未开始活动。", { exact: true })).toBeVisible();
        await panel.getByRole("button", { name: "关闭", exact: true }).click();
        await expect(toggle).toBeFocused();
        await expect(panel).toHaveCount(0);
        await page.keyboard.press("Control+k");
        await expect(panel).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(panel).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true
        );
        await page.goto("/?q=GitHub");
        await page.keyboard.press("Control+k");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "AI 搜索", exact: true })).toHaveCount(0);
    });
}
