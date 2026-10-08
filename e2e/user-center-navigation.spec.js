import { expect, test } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

const user = {
    id: 7,
    username: "trier",
    nickname: "trier",
    role: "user",
    organization_cr: "",
    followers_count: 0,
    following_count: 0,
};

const profileCard = {
    id: 7,
    slogan: "",
    status: "",
    tags: [],
    social_links: [],
    cards: [],
    version: 0,
    background: {},
    works: [],
};

async function installUserCenterMocks(page) {
    await page.addInitScript(() => {
        window.sessionStorage.setItem("token", "e2e-user-center-token");
        window.localStorage.setItem("i18nextLng", "zh");
    });

    await page.route("**/api/auth/me", (route) =>
        route.fulfill({
            json: {
                ...user,
                registrationProfile: {
                    name: "Test User",
                    studentId: "test-only",
                    major: "Design",
                    grade: "junior",
                },
            },
        })
    );
    await page.route("**/api/settings", (route) =>
        route.fulfill({ json: { pagination_enabled: "true" } })
    );
    await page.route("**/api/notifications**", (route) =>
        route.fulfill({
            json: { notifications: [], unreadCount: 0, unread_count: 0 },
        })
    );
    await page.route("**/api/users/7/profile", (route) => route.fulfill({ json: user }));
    await page.route("**/api/users/7/resources", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/users/7/profile-card", (route) =>
        route.fulfill({ json: profileCard })
    );

    await page.route("**/api/users/me/identity-claims", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/users/me/outcome-links**", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/events/assistant/preferences", (route) =>
        route.fulfill({
            json: {
                college: "",
                division: "",
                grade: "",
                campus: "",
                availability: "",
                interestTags: [],
                preferredCategories: [],
                preferredBenefits: [],
                preferredFormat: "",
            },
        })
    );
    await page.route("**/api/auth/wechat-miniapp/status", (route) =>
        route.fulfill({ json: { bound: false, unavailable: true } })
    );
}

test("mobile profile keeps public content inline and account tools accessible", async ({
    page,
}) => {
    await installUserCenterMocks(page);
    await page.setViewportSize(mobileViewport);
    await page.goto("/user/7/center?miniapp=1");
    await expect(page.getByRole("heading", { name: "trier", exact: true })).toBeVisible();
    await expect(page.getByTestId("user-system-stat-account")).toHaveCount(0);
    await page.getByRole("button", { name: "编辑个人资料", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "显示名称", exact: true })).toHaveValue("trier");
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await page.locator("summary").filter({ hasText: "账号与管理" }).click();
    await page.getByRole("button", { name: "活动偏好", exact: true }).click();
    await expect(page).toHaveURL(/tab=settings&settings=activity-profile/);
    await expect(page.getByTestId("activity-profile-section")).toBeVisible();
    await page.getByRole("button", { name: "← 返回个人主页", exact: true }).click();
    await expect(page.getByRole("heading", { name: "trier", exact: true })).toBeVisible();
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).toBeTruthy();
});

test("failed and conflicting saves keep drafts until the owner chooses to discard", async ({
    page,
}) => {
    await installUserCenterMocks(page);
    await page.route("**/api/users/me/profile-card", (route) =>
        route.fulfill({ status: 503, json: { error: "unavailable" } })
    );
    await page.goto("/user/7/center?miniapp=1");
    await page.getByRole("button", { name: "编辑个人资料", exact: true }).click();
    const input = page.getByRole("textbox", { name: "一句话介绍", exact: true });
    await input.fill("Keep my draft");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("保存失败");
    await expect(input).toHaveValue("Keep my draft");
    await page.route("**/api/users/me/profile-card", (route) =>
        route.fulfill({ status: 409, json: { error: "changed" } })
    );
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("其他页面更新");
    await expect(input).toHaveValue("Keep my draft");
    await expect(page.getByRole("button", { name: "保存", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "放弃本次修改，加载最新", exact: true }).click();
    await expect(page.getByRole("button", { name: "编辑个人资料", exact: true })).toBeVisible();
});
