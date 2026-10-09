import { test, expect } from "@playwright/test";
import fs from "node:fs";
const template = JSON.parse(
    fs.readFileSync(new URL("../shared/hackathonAiX.json", import.meta.url), "utf8")
);
const registration = {
    id: 42,
    eventKey: template.event.key,
    answers: { name: "UI Test", track: ["campus"] },
    repositories: {
        githubUrl: "https://github.com/test/project",
        modelscopeUrl: "",
        updatedAt: "2026-10-09T00:00:00Z",
    },
};
async function prepare(
    page,
    { date = "2026-10-18T11:00:00+08:00", error = false, published = false } = {}
) {
    await page.clock.setFixedTime(new Date(date));
    await page.addInitScript(() => {
        localStorage.setItem("token", "fixture");
        localStorage.setItem("i18nextLng", "zh");
        localStorage.setItem("ui_mode_v3", "dark");
    });
    const event = structuredClone(template);
    if (published)
        event.event.program.challenges = [
            {
                id: "brief",
                track: "industry",
                stage: "initial",
                published: true,
                title: "正式赛题测试",
                description: "只有当前赛道和阶段显示这个题目。",
                briefUrl: "https://example.test/brief",
                submissionUrl: "https://example.test/submit",
            },
        ];
    await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/auth/me")
            return route.fulfill({
                json: {
                    id: 42,
                    username: "ui_test",
                    registrationProfile: {
                        name: "UI Test",
                        studentId: "UI42",
                        major: "Test",
                        grade: "junior",
                    },
                },
            });
        if (url.pathname === "/api/hackathon/schedule")
            return route.fulfill({ json: { events: [event], activeEventKey: event.event.key } });
        if (url.pathname === "/api/hackathon/registration")
            return error
                ? route.fulfill({ status: 503, json: { error: "fixture failure" } })
                : route.fulfill({ json: { registration } });
        if (url.pathname === "/api/hackathon/registration/repositories")
            return route.fulfill({ status: 503, json: { error: "fixture save failure" } });
        if (route.request().method() !== "GET") return route.abort();
        return route.continue();
    });
}
test("published brief has a live action; changing stage removes the other stage brief", async ({
    page,
}) => {
    await prepare(page, { published: true });
    await page.goto("/hackathon/2/challenges?track=industry");
    await expect(page.getByText("正式赛题测试", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "赛题指定提交入口" })).toBeVisible();
    await page.getByRole("button", { name: /复赛/ }).click();
    await expect(page.getByText("正式赛题测试", { exact: true })).toHaveCount(0);
    await expect(page.locator(".aix-status")).toHaveText("赛题待发布");
});
test("saved one repository, unsaved edits, failed save preserves input", async ({ page }) => {
    await prepare(page);
    await page.goto("/hackathon/2/challenges#submission");
    await expect(page.locator(".aix-repository-state")).toHaveText("已保存 1 个仓库");
    await page.locator("#repository-modelscopeUrl").fill("https://modelscope.cn/studios/test/new");
    await expect(page.locator(".aix-repository-state")).toHaveText("有未保存的修改");
    await page.locator(".aix-repository-form button[type=submit]").click();
    await expect(page.locator("#repository-error")).toBeVisible();
    await expect(page.locator("#repository-modelscopeUrl")).toHaveValue(
        "https://modelscope.cn/studios/test/new"
    );
});
test("ended event retains saved links with disabled inputs and no save action", async ({
    page,
}) => {
    await prepare(page, { date: "2026-10-26T12:00:00+08:00" });
    await page.goto("/hackathon/2/challenges#submission");
    await expect(page.locator("#repository-githubUrl")).toBeDisabled();
    await expect(page.locator(".aix-repository-form button[type=submit]")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "查看已提交仓库" })).toHaveAttribute(
        "href",
        registration.repositories.githubUrl
    );
});
test("registration read failure presents retry instead of an empty submission form", async ({
    page,
}) => {
    await prepare(page, { error: true });
    await page.goto("/hackathon/2/challenges#submission");
    await expect(page.getByRole("heading", { name: "报名信息加载失败" })).toBeVisible({
        timeout: 15000,
    });
    await expect(page.locator(".aix-submission-gate button")).toBeVisible();
    await expect(page.locator("#repository-githubUrl")).toHaveCount(0);
    await prepare(page);
    await page.locator(".aix-submission-gate button").click();
    await expect(page.locator("#repository-githubUrl")).toHaveValue(
        registration.repositories.githubUrl
    );
});
