import { expect, test } from "@playwright/test";

const sourceUrl = "http://www.xlzx.zju.edu.cn/2026/0917/c55627a3204493/page.htm";
const event = {
    id: 328,
    title: "正念舞动8周团体（第2期）招募",
    description: "面向同学招募5—8名固定成员。",
    content: [
        "浙江大学心理健康教育与咨询中心开展正念舞动团体，面向同学招募5—8名固定成员。",
        "安排：2026年10月14、21、28日，11月4、11、18、25日和12月2日，均为周三10:00—11:00。\n地点：紫金港校区银泉学生服务中心心理中心303正念冥想室。\n报名截止：2026年9月30日。可扫描封面中的官方登记二维码。",
        "内容围绕身体觉察、自我需求、人际边界与团体合作展开，无需舞蹈基础。",
        "记点条件：全程参与并完成反馈，经校团委审核后申请，最高0.6记点。",
        "官方提醒：这是心理成长与探索性质的团体，不能代替药物或心理治疗；身体状况是否适合参与应向医生咨询。",
        `来源：${sourceUrl}`,
    ].join("\n\n"),
    date: "2026-10-14T10:00:00+08:00",
    end_date: "2026-12-02T11:00:00+08:00",
    location: "紫金港校区银泉学生服务中心心理中心303正念冥想室",
    category: "activity",
    status: "approved",
};

async function openDetail(page, mode) {
    await page.addInitScript((value) => {
        localStorage.setItem("ui_mode_v3", value);
        localStorage.setItem("i18nextLng", "zh");
    }, mode);
    await page.route("**/api/**", (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/settings")
            return route.fulfill({ json: { pagination_enabled: "false", language: "zh" } });
        if (path === "/api/auth/me")
            return route.fulfill({ status: 401, json: { error: "unauthorized" } });
        if (path === "/api/events/328") return route.fulfill({ json: event });
        if (path === "/api/events")
            return route.fulfill({
                json: { data: [event], pagination: { page: 1, total: 1, totalPages: 1 } },
            });
        return route.fulfill({ json: [] });
    });
    await page.goto("/events?id=328");
    await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
    await expect(page.getByTestId("event-detail-content")).toBeVisible();
}

for (const mode of ["day", "dark"]) {
    for (const width of [390, 1440]) {
        test(`plain event detail preserves structure at ${width}px in ${mode} mode`, async ({
            page,
        }, testInfo) => {
            await page.setViewportSize({ width, height: 1000 });
            await openDetail(page, mode);
            const body = page.getByTestId("event-detail-content");
            await expect(body.locator(":scope > p")).toHaveCount(6);
            await expect(body.locator("br")).toHaveCount(2);
            await expect(body.locator("strong")).toHaveText([
                "安排：",
                "地点：",
                "报名截止：",
                "记点条件：",
                "官方提醒：",
                "来源：",
            ]);
            await expect(body.getByRole("link")).toHaveAttribute("href", sourceUrl);
            await expect(body).toContainText("不能代替药物或心理治疗");
            expect(await body.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
            await body.scrollIntoViewIfNeeded();
            await body.screenshot({ path: testInfo.outputPath("detail-content.png") });
        });
    }
}

test("rich HTML, plaintext fallback and unsafe content stay safe", async ({ page }) => {
    await openDetail(page, "dark");
    const results = await page.evaluate(async () => {
        const { formatEventContent } = await import("/src/utils/eventContent.js");
        const parse = (value, fallback) => {
            const html = formatEventContent(value, fallback);
            const doc = new DOMParser().parseFromString(html, "text/html");
            return {
                html,
                text: doc.body.textContent,
                paragraphs: doc.querySelectorAll("p").length,
                breaks: doc.querySelectorAll("br").length,
                headings: doc.querySelectorAll("h3").length,
                items: doc.querySelectorAll("li").length,
                unsafe: doc.querySelectorAll("script, [onerror], [onclick], a[href^='javascript:']")
                    .length,
            };
        };
        return {
            rich: parse("<h3>活动内容</h3><ul><li>第一项</li><li>第二项</li></ul>"),
            fallback: parse("  ", "人数 < 8 & > 2\r\n安排：周三\r\n\r\n注意事项：请准时"),
            unsafe: parse(
                '<p onclick="alert(1)">正文</p><script>alert(1)</script><img onerror="alert(1)" src="x"><a href="javascript:alert(1)">链接</a>'
            ),
            empty: parse(null, null),
        };
    });
    expect(results.rich).toMatchObject({ headings: 1, items: 2 });
    expect(results.fallback).toMatchObject({ paragraphs: 2, breaks: 1 });
    expect(results.fallback.text).toContain("人数 < 8 & > 2");
    expect(results.unsafe.unsafe).toBe(0);
    expect(results.empty.html).toBe("");
});
