import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const source = JSON.parse(readFileSync(new URL("../shared/hackathonAiX.json", import.meta.url)));
const sampleUser = { id: 900001, username: "inline-ui-test", role: "user", account_type: "person" };
const answers = {
    name: "测试参赛者",
    studentId: "TEST-001",
    major: "计算机",
    grade: "junior",
    track: "campus",
    contact: "participant@example.test",
    team: "测试队伍",
};

test.use({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });

async function prepare(page, { signedIn = true, failure = null } = {}) {
    const template = structuredClone(source);
    template.event.endAt = "2099-10-24T17:00";
    template.event.program.registrationClosesAt = "2099-10-18T09:00:00+08:00";
    let saved = null;
    const posts = [];
    await page.addInitScript(
        ({ signedIn }) => {
            localStorage.setItem("i18nextLng", "zh");
            if (signedIn) sessionStorage.setItem("token", "inline-ui-test-token");
        },
        { signedIn }
    );
    // Every API request stays in the browser fixture; no test registration reaches the server.
    await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        let status = 200;
        let json = {};
        if (url.pathname.endsWith("/hackathon/schedule"))
            json = { events: [template], activeEventKey: template.event.key };
        else if (url.pathname.endsWith("/auth/me")) json = sampleUser;
        else if (url.pathname.endsWith("/auth/login"))
            json = { token: "inline-ui-test-token", user: sampleUser };
        else if (url.pathname.endsWith("/hackathon/registration")) json = { registration: saved };
        else if (url.pathname.endsWith("/hackathon/register")) {
            const body = route.request().postDataJSON();
            posts.push(body);
            if (failure === "network" && posts.length === 1) {
                status = 500;
                json = { error: "测试：请重试" };
            } else if (failure === "duplicate") {
                saved = {
                    id: 21,
                    eventKey: template.event.key,
                    answers: { ...answers, name: "已保存参赛者" },
                };
                status = 409;
                json = { error: "已经报名" };
            } else {
                saved = { id: 21, eventKey: body.eventKey, answers: body.answers };
                json = { id: 21 };
            }
        }
        await route.fulfill({ status, json });
    });
    return posts;
}

async function fillForm(page) {
    for (const [id, value] of Object.entries(answers)) {
        const field = page.locator(`#hackathon-field-${id}`);
        if (["grade", "track"].includes(id)) await field.selectOption(value);
        else await field.fill(value);
    }
}

test("registration from another tab opens the inline form and keeps the draft through login", async ({
    page,
}) => {
    const posts = await prepare(page, { signedIn: false });
    await page.goto("/hackathon/2/challenges");
    await page.locator(".hx-event-actions button").click();
    await expect(page).toHaveURL(/\/hackathon\/2#registration-form$/);
    await expect(page.locator("#registration-form input, #registration-form select")).toHaveCount(
        7
    );
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await page.getByLabel("姓名", { exact: false }).fill("未提交草稿");
    await page.getByRole("button", { name: "登录并继续", exact: true }).click();
    const auth = page.getByRole("dialog");
    await expect(auth).toBeVisible();
    await auth.getByLabel("用户名", { exact: true }).fill("inline-ui-test");
    await auth.getByLabel("密码", { exact: true }).fill("test-only-password");
    await auth.getByRole("button", { name: "登录", exact: true }).click();
    await expect(auth).not.toBeVisible();
    await expect(page.locator("#hackathon-field-name")).toHaveValue("未提交草稿");
    await expect(page.getByRole("button", { name: "提交报名", exact: true })).toBeEnabled();
    expect(posts).toHaveLength(0);
});

test("failed submit keeps all answers, and success remains visible after reload", async ({
    page,
}) => {
    const posts = await prepare(page, { failure: "network" });
    await page.goto("/hackathon/2#registration-form");
    await fillForm(page);
    await page.getByRole("button", { name: "提交报名", exact: true }).click();
    await expect(page.getByText("测试：请重试", { exact: true })).toBeVisible();
    expect(posts).toHaveLength(1);
    await expect(page.locator("#hackathon-field-contact")).toHaveValue(answers.contact);
    await page.getByRole("button", { name: "提交报名", exact: true }).click();
    await expect(page.getByRole("button", { name: "报名成功", exact: true })).toBeDisabled();
    expect(posts).toHaveLength(2);
    expect(posts[1].eventKey).toBe(source.event.key);
    expect(posts[1].answers).toEqual(answers);
    await page.reload();
    await expect(page.locator("#hackathon-field-name")).toHaveValue(answers.name);
    await expect(page.locator("#hackathon-field-name")).toBeDisabled();
    await expect(page.getByRole("button", { name: "报名成功", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "退出登录", exact: true }).click();
    await expect(page.locator("#hackathon-field-name")).toHaveValue("");
    await expect(page.getByRole("button", { name: "登录并继续", exact: true })).toBeEnabled();
});

test("a duplicate response reads the saved registration without resubmitting", async ({ page }) => {
    const posts = await prepare(page, { failure: "duplicate" });
    await page.goto("/hackathon/2#registration-form");
    await fillForm(page);
    await page.getByRole("button", { name: "提交报名", exact: true }).click();
    await expect(page.locator("#hackathon-field-name")).toHaveValue("已保存参赛者");
    await expect(page.getByRole("button", { name: "报名成功", exact: true })).toBeDisabled();
    expect(posts).toHaveLength(1);
});
