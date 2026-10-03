import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const makeCampaign = (id, title, status = "open") => ({
    id,
    title,
    description: "公众号抽奖推广",
    rules: "集赞至少 40 个，提交截图后由管理员审核。",
    status,
    version: 1,
    proof_required: 1,
    review_required: 1,
    opens_at: Date.now() + 3600000,
    closes_at: Date.now() + 86400000,
    draws_at: Date.now() + 172800000,
    claims_until: Date.now() + 259200000,
    prizes: [{ id: "prize-one", name: "纪念礼品", quantity: 1 }],
    counts: { submitted: 0, pending: 0, approved: 0 },
});

async function installMocks(page, initial = [], mode = "day") {
    const campaigns = [...initial];
    await page.addInitScript((theme) => {
        localStorage.setItem("token", "mock-lottery-admin");
        localStorage.setItem("ui_mode_v3", theme);
        localStorage.setItem("i18nextLng", "zh");
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: async (text) => {
                    window.copiedLotteryLink = text;
                },
            },
            configurable: true,
        });
    }, mode);
    await page.route("**/api/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace(/^\/api/, "");
        if (path === "/auth/me")
            return route.fulfill({
                json: {
                    id: 1,
                    username: "推广测试管理员",
                    role: "admin",
                    registrationProfile: {
                        name: "测试管理员",
                        studentId: "LOTTERY-TEST-ADMIN",
                        major: "计算机",
                        grade: "junior",
                    },
                },
            });
        if (path === "/admin/capabilities")
            return route.fulfill({
                json: { isPlatformAdmin: true, permissions: ["*"], scope: "platform" },
            });
        if (path === "/settings")
            return route.fulfill({ json: { language: "zh", site_title: "拓浙 AI 生态" } });
        if (path === "/lotteries/admin") {
            if (request.method() === "POST") {
                const campaign = {
                    ...makeCampaign("saved-draft", "新建抽奖", "draft"),
                    ...request.postDataJSON(),
                    id: "saved-draft",
                };
                campaigns.push(campaign);
                return route.fulfill({ status: 201, json: { id: campaign.id } });
            }
            return route.fulfill({ json: campaigns });
        }
        if (/\/lotteries\/admin\/[^/]+\/entries$/.test(path))
            return route.fulfill({ json: { items: [], total: 0 } });
        if (/\/lotteries\/admin\/[^/]+\/audit$/.test(path)) return route.fulfill({ json: [] });
        const campaign = campaigns.find((c) => path === `/lotteries/admin/${c.id}`);
        if (campaign) {
            if (request.method() === "PUT") {
                const payload = request.postDataJSON();
                if (payload.version !== campaign.version)
                    return route.fulfill({ status: 409, json: { error: "locked" } });
                Object.assign(campaign, payload, { version: campaign.version + 1 });
                return route.fulfill({ json: { id: campaign.id } });
            }
            return route.fulfill({ json: campaign });
        }
        return route.fulfill({ json: [] });
    });
}

test("saving a new draft generates its own QR code with a publication notice", async ({ page }) => {
    await installMocks(page);
    await page.goto("/admin?tab=lotteries");
    const promotion = page.getByRole("region", { name: "推文推广" });
    await expect(promotion.getByText(/保存草稿后/)).toBeVisible();
    await expect(promotion.getByRole("img")).toHaveCount(0);
    await page.getByLabel("活动名称", { exact: true }).fill("集赞抽奖推广测试");
    await page.getByLabel(/^参与规则/).fill("集赞至少 40 个并上传截图。");
    await page.getByLabel("报名开始", { exact: true }).fill("2099-10-01T10:00");
    await page.getByLabel("报名截止", { exact: true }).fill("2099-10-02T10:00");
    await page.getByLabel("统一开奖", { exact: true }).fill("2099-10-03T10:00");
    await page.getByLabel("领奖截止", { exact: true }).fill("2099-10-04T10:00");
    await page.getByLabel("奖品名称", { exact: true }).fill("纪念礼品");
    await page.getByRole("button", { name: "保存草稿", exact: true }).click();
    await expect(promotion.getByLabel("本期抽奖链接")).toHaveValue(
        "http://localhost:5180/hackathon/2/lottery?campaign=saved-draft"
    );
    await expect(promotion.getByRole("img", { name: "本期抽奖二维码" })).toBeVisible();
    await expect(promotion.getByText(/本期尚未发布/)).toBeVisible();
});

for (const { width, mode } of [
    { width: 1440, mode: "day" },
    { width: 390, mode: "dark" },
]) {
    test(`published campaign edits save without replacing the campaign at ${width}px`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await installMocks(page, [makeCampaign("published", "已发布抽奖")], mode);
        await page.goto("/admin?tab=lotteries");
        const list = page.getByRole("navigation", { name: "社区抽奖", exact: true });
        await list.getByRole("button", { name: /已发布抽奖/ }).click();
        const promotion = page.getByRole("region", { name: "推文推广" });
        const qr = promotion.getByRole("img", { name: "本期抽奖二维码" });
        await expect(qr).toBeVisible();
        const originalQr = await qr.getAttribute("src");
        await page.getByLabel("活动名称", { exact: true }).fill("发布后修改的抽奖");
        await page.getByLabel(/^参与规则/).fill("修订参与规则，请提交完整截图。");
        await page.getByLabel("奖品名称", { exact: true }).fill("更新后的礼品");
        const response = page.waitForResponse(
            (r) => r.url().endsWith("/lotteries/admin/published") && r.request().method() === "PUT"
        );
        await page.getByRole("button", { name: "保存修改", exact: true }).click();
        expect((await response).status()).toBe(200);
        await expect(page.getByRole("status")).toHaveText("修改已保存，活动保持已发布");
        await expect(page.getByLabel("活动名称", { exact: true })).toHaveValue("发布后修改的抽奖");
        await expect(page.getByLabel("奖品名称", { exact: true })).toHaveValue("更新后的礼品");
        await expect(list.getByRole("button", { name: /发布后修改的抽奖.*报名中/ })).toBeVisible();
        await expect(promotion.getByLabel("本期抽奖链接")).toHaveValue(
            "http://localhost:5180/lotteries/published"
        );
        await expect(qr).toHaveAttribute("src", originalQr);
        await page.reload();
        await list.getByRole("button", { name: /发布后修改的抽奖/ }).click();
        await expect(page.getByLabel(/^参与规则/)).toHaveValue("修订参与规则，请提交完整截图。");
        await page
            .locator(".lottery-admin-grid")
            .screenshot({ path: testInfo.outputPath("published-edit.png") });
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
    });
    test(`campaign links and downloadable QR codes stay correct when switching at ${width}px`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await installMocks(
            page,
            [
                makeCampaign("campaign-one", "第一期抽奖"),
                makeCampaign("campaign-two", "第二期抽奖"),
            ],
            mode
        );
        await page.goto("/admin?tab=lotteries");
        const campaignList = page.getByRole("navigation", { name: "社区抽奖", exact: true });
        const promotion = page.getByRole("region", { name: "推文推广" });
        await campaignList.getByRole("button", { name: /第一期抽奖/ }).click();
        const qr = promotion.getByRole("img", { name: "本期抽奖二维码" });
        await expect(qr).toBeVisible();
        const firstQr = await qr.getAttribute("src");
        await promotion.getByRole("button", { name: "复制活动链接" }).click();
        await expect
            .poll(() => page.evaluate(() => window.copiedLotteryLink))
            .toBe("http://localhost:5180/lotteries/campaign-one");
        await campaignList.getByRole("button", { name: /第二期抽奖/ }).click();
        await expect(promotion.getByLabel("本期抽奖链接")).toHaveValue(
            "http://localhost:5180/lotteries/campaign-two"
        );
        await expect(qr).toBeVisible();
        await expect(qr).not.toHaveAttribute("src", firstQr);
        const downloadPromise = page.waitForEvent("download");
        await promotion.getByRole("link", { name: "下载二维码 PNG" }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe("lottery-campaign-two-qr.png");
        const imagePath = testInfo.outputPath("campaign-two-qr.png");
        await download.saveAs(imagePath);
        const png = await fs.readFile(imagePath);
        expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        expect(png.readUInt32BE(16)).toBe(1024);
        expect(png.readUInt32BE(20)).toBe(1024);
        await promotion.screenshot({ path: testInfo.outputPath("promotion.png") });
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
    });
}

test("drawn, cancelled and due campaigns keep configuration locked", async ({ page }) => {
    const due = makeCampaign("due", "待补处理抽奖");
    due.draws_at = Date.now() - 1000;
    await installMocks(page, [
        makeCampaign("drawn", "已开奖抽奖", "drawn"),
        makeCampaign("cancelled", "已取消抽奖", "cancelled"),
        due,
    ]);
    await page.goto("/admin?tab=lotteries");
    const list = page.getByRole("navigation", { name: "社区抽奖", exact: true });
    for (const name of ["已开奖抽奖", "已取消抽奖", "待补处理抽奖"]) {
        await list.getByRole("button", { name: new RegExp(name) }).click();
        await expect(page.getByLabel("活动名称", { exact: true })).toBeDisabled();
        await expect(page.getByRole("button", { name: "保存修改", exact: true })).toHaveCount(0);
        await expect(
            page.getByText(/已到开奖时间、已开奖或已取消的活动不能修改配置/)
        ).toBeVisible();
    }
});
