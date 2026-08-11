import { expect, test } from "@playwright/test";

const adminUser = {
    id: 1,
    username: "seed_admin",
    role: "admin",
};

const statsPayload = {
    counts: { photos: 8, music: 3, videos: 4, articles: 5, events: 6 },
    breakdown: {
        photos: { active: 6, pending: 1, deleted: 1 },
        music: { active: 3, pending: 0, deleted: 0 },
        videos: { active: 3, pending: 1, deleted: 0 },
        articles: { active: 4, pending: 1, deleted: 0 },
        events: { active: 5, pending: 0, deleted: 1 },
    },
    eventAnalytics: {
        totalViews: 2345,
        totalRegistrations: 178,
        upcomingCount: 3,
        views7d: 412,
        registrations7d: 34,
        hottestEvents: [
            {
                id: 11,
                title: "AI 全栈极速黑客松",
                date: "2026-05-20",
                views: 1288,
                registrations: 96,
            },
        ],
    },
    system: {
        uptime: 98765,
        nodeVersion: "v22.0.0",
        platform: "win32",
    },
};

const resourceItems = [
    {
        id: 101,
        title: "紫金港春日影像",
        status: "approved",
        tags: "校园,摄影",
        url: "/newlogo.png",
    },
    {
        id: 102,
        title: "待审核活动海报",
        status: "pending",
        tags: "活动",
        url: "/newlogo.png",
    },
];

const buildResourcePayload = (status = "all") => {
    const data =
        status && status !== "all"
            ? resourceItems.filter((item) => item.status === status)
            : resourceItems;
    return {
        data,
        pagination: { page: 1, total: data.length, totalPages: 1 },
    };
};

const hackathonPayload = [
    {
        id: 1,
        name: "张同学",
        student_id: "3230100001",
        major: "计算机科学与技术",
        grade: "junior",
        ai_tools: JSON.stringify(["codex", "cursor"]),
        experience: "做过校园活动推荐原型。",
        created_at: "2026-05-01T10:30:00.000Z",
    },
    {
        id: 2,
        name: "李同学",
        student_id: "3230100002",
        major: "信息管理",
        grade: "freshman",
        ai_tools: JSON.stringify(["claude"]),
        experience: "参与过社群运营分析。",
        created_at: "2026-05-02T12:00:00.000Z",
    },
];

const usersPayload = [
    {
        id: 1,
        username: "123",
        role: "admin",
        created_at: "2026-05-01T09:00:00.000Z",
    },
    {
        id: 2,
        username: "student_demo",
        role: "user",
        created_at: "2026-05-02T09:00:00.000Z",
    },
];

const tagsPayload = [
    {
        id: 1,
        name: "校园",
        count: 4,
        section: "gallery",
    },
    {
        id: 2,
        name: "活动",
        count: 2,
        section: "events",
    },
];

const messagesPayload = [
    {
        id: 1,
        name: "访客 A",
        email: "visitor@example.com",
        message: "想咨询黑客松活动的报名时间。",
        read: 0,
        date: "2026-05-03T10:30:00.000Z",
    },
    {
        id: 2,
        name: "校友 B",
        email: "alumni@example.com",
        message: "希望补充一条校友资源。",
        read: 1,
        date: "2026-05-02T10:30:00.000Z",
    },
];

const projectsPayload = {
    items: [
        {
            id: 31,
            user_id: 2,
            owner_name: "student_demo",
            owner_profiles: ["浙江大学 AI 社团"],
            title: "校园 AI 助手",
            intro: "面向校园服务的智能问答项目",
            progress: "dev",
            need_tags: ["产品"],
            tech_tags: ["React"],
            status: "published",
            report_count: 1,
            latest_report_reason: "联系方式疑似失效",
            updated_at: "2026-05-04T10:00:00.000Z",
        },
    ],
    page: 1,
    limit: 60,
    total: 1,
    totalPages: 1,
};

const aiOverviewPayload = {
    health: {
        eventCount: 12,
        uncategorizedEventCount: 3,
        enabledModelConfigCount: 1,
    },
    recentRuns: [],
    agentSystem: {
        summary: {
            agentCount: 1,
            averageMaturity: 0.82,
            highPriorityGapCount: 0,
            liveAgentCount: 1,
        },
        modules: [
            {
                id: "event-recommendation",
                title: "Event Recommendation Agent",
                entrance: "Events page AI search",
                description: "Recommend explainable campus activities.",
                status: "live",
                nextImprovements: ["这段内部下一步不应出现在管理员主界面"],
            },
        ],
        partialGaps: [
            {
                agentId: "event-recommendation",
                agentTitle: "Event Recommendation Agent",
                dimensionId: "observability",
                dimensionLabel: "Observability",
            },
        ],
        nextIterationPlan: [
            {
                order: 1,
                target: "Event Recommendation Agent",
                dimension: "Observability",
                task: "这段内部路线图不应出现在管理员主界面",
            },
        ],
    },
};

const aiScanPayload = {
    runId: "run-20260506",
    summary: {
        scannedEventCount: 12,
        suggestionCount: 1,
        highConfidenceCount: 1,
    },
    suggestions: [
        {
            id: 501,
            eventId: 11,
            eventTitle: "AI 全栈极速黑客松",
            fieldLabel: "分类",
            currentValue: "",
            suggestedValue: "创新创业",
            confidence: 0.86,
            status: "suggested",
            reason: "标题和描述包含黑客松、全栈、项目路演等活动治理关键词。",
        },
    ],
};

const aiModelConfigsPayload = [
    {
        id: 1,
        name: "DeepSeek 默认接口",
        base_url: "https://api.deepseek.com/v1",
        model: "deepseek-chat",
        masked_api_key: "sk-***-test",
        priority: 100,
        enabled: true,
        last_status: "ok",
    },
];

const installAdminMocks = async (page) => {
    await page.addInitScript(() => {
        localStorage.setItem("token", "mock-admin-token");
        localStorage.setItem("ui_mode_v2", "day");
    });

    await page.route("**/api/**", (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname.replace(/^\/api/, "");

        if (path === "/auth/me") {
            return route.fulfill({ json: adminUser });
        }

        if (path === "/settings") {
            return route.fulfill({
                json: {
                    site_title: "拓浙AI生态 | TUOZHE AI ECOSYSTEM",
                    pagination_enabled: "false",
                    language: "zh",
                },
            });
        }

        if (path === "/stats") {
            return route.fulfill({ json: statsPayload });
        }

        if (path === "/admin/pending") {
            return route.fulfill({ json: [] });
        }

        if (path === "/photos") {
            return route.fulfill({
                json: buildResourcePayload(url.searchParams.get("status") || "all"),
            });
        }

        if (path === "/admin/hackathon/registrations") {
            return route.fulfill({ json: hackathonPayload });
        }

        if (path === "/admin/users") {
            return route.fulfill({ json: usersPayload });
        }

        if (path === "/tags" && request.method() === "GET") {
            return route.fulfill({ json: tagsPayload });
        }

        if (path === "/admin/messages" && request.method() === "GET") {
            return route.fulfill({ json: messagesPayload });
        }

        if (path === "/admin/projects" && request.method() === "GET") {
            return route.fulfill({ json: projectsPayload });
        }

        if (path === "/admin/ai-assistant/overview") {
            return route.fulfill({ json: aiOverviewPayload });
        }

        if (path === "/admin/ai-assistant/event-governance/scan" && request.method() === "POST") {
            return route.fulfill({ json: aiScanPayload });
        }

        if (path === "/admin/ai-assistant/event-governance/apply" && request.method() === "POST") {
            return route.fulfill({
                json: {
                    appliedCount: 1,
                    skippedCount: 0,
                    details: [{ id: 501, status: "applied" }],
                },
            });
        }

        if (path === "/admin/ai-model-configs" && request.method() === "GET") {
            return route.fulfill({ json: aiModelConfigsPayload });
        }

        if (path === "/admin/ai-model-configs/1" && request.method() === "DELETE") {
            return route.fulfill({ json: { success: true } });
        }

        if (request.method() === "GET") {
            return route.fulfill({
                json: { data: [], pagination: { page: 1, total: 0, totalPages: 1 } },
            });
        }

        return route.fulfill({ json: { success: true } });
    });
};

test.describe("admin console refinement", () => {
    test("admin access gate keeps unauthenticated users in admin context", async ({ page }) => {
        await page.route("**/api/settings", (route) =>
            route.fulfill({
                json: {
                    site_title: "拓浙AI生态 | TUOZHE AI ECOSYSTEM",
                    pagination_enabled: "false",
                    language: "zh",
                },
            })
        );

        await page.goto("/admin?tab=photos");

        await expect(page).toHaveURL(/\/admin\?tab=photos/);
        await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
        await expect(page.getByLabel("账号")).toHaveValue("123");
        await expect(page.getByRole("button", { name: "进入管理员后台" })).toBeVisible();
    });

    test("desktop overview, resource navigation, and hackathon manager render refined controls", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1440, height: 1050 });
        await installAdminMocks(page);

        await page.goto("/admin");
        await expect(page).toHaveURL(/\/admin\?tab=overview/);

        await expect(page.getByRole("heading", { name: "管理控制台" })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
        await expect(page.getByRole("link", { name: "拓浙AI生态首页" })).toBeVisible();
        await expect(page.getByRole("button", { name: "打开总览模块" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "运营总览" })).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "运营总览" }).locator("xpath=ancestor::header[1]")
        ).not.toHaveClass(/rect-surface|theme-admin-panel/);
        await expect(page.getByRole("button", { name: /待审核 3/ })).toBeVisible();
        await expect(page.getByRole("button", { name: /内容总量 26/ })).toBeVisible();
        await expect(page.getByRole("button", { name: /近 7 日访问/ })).toBeVisible();
        await expect(page.getByRole("heading", { name: "当前工作" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "内容状态" })).toBeVisible();
        const adminNavigation = page.getByRole("complementary", { name: "管理员导航" });
        await expect(adminNavigation.getByText("内容与审核", { exact: true })).toBeVisible();
        await expect(adminNavigation.getByText("主体与关系", { exact: true })).toBeVisible();
        await expect(adminNavigation.getByText("生态项目运营", { exact: true })).toBeVisible();
        await expect(adminNavigation.getByText("AI 能力治理", { exact: true })).toBeVisible();
        await expect(adminNavigation.getByText("系统与审计", { exact: true })).toBeVisible();
        await expect(
            adminNavigation.getByRole("button", { name: "打开内容采集模块" })
        ).toBeVisible();
        const quickJump = page.getByRole("combobox", {
            name: "快速跳转到管理模块",
        });
        await expect(quickJump).toHaveValue("overview");

        const navSearch = page.getByRole("searchbox", { name: "搜索管理模块" });
        await navSearch.fill("标签");
        await page.getByRole("button", { name: /打开.*标签.*模块/ }).click();
        await expect(page).toHaveURL(/tab=tags/);
        await expect(page.getByRole("heading", { name: "标签管理" })).toBeVisible();
        await quickJump.selectOption("overview");
        await expect(page).toHaveURL(/tab=overview/);
        await expect(quickJump).toHaveValue("overview");

        await quickJump.selectOption("wechat-mp");
        await expect(page).toHaveURL(/tab=wechat-mp/);
        await expect(page.getByRole("heading", { name: "内容采集" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "概况" })).toHaveAttribute(
            "aria-selected",
            "true"
        );
        await expect(page.getByRole("heading", { name: "最近采集" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "候选内容" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "采集流水线" })).toHaveCount(0);
        await expect(page.getByText("定时与风控参数")).toHaveCount(0);
        await page.getByRole("tab", { name: "连接与工具" }).click();
        await expect(page.getByRole("heading", { name: "扫码登录" })).toBeVisible();
        await expect(page.getByRole("button", { name: "扫码登录" })).toBeVisible();

        await quickJump.selectOption("settings");
        await expect(page.getByRole("heading", { name: "站点设置" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "基础与安全" })).toHaveAttribute(
            "aria-selected",
            "true"
        );
        await page.getByRole("tab", { name: "关于站点" }).click();
        await expect(page.getByRole("tab", { name: "团队身份" })).toHaveAttribute(
            "aria-selected",
            "true"
        );
        await expect(page.getByRole("textbox", { name: "团队标题" })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "数据 1 数值" })).toHaveCount(0);
        await page.getByRole("tab", { name: "数据依据" }).click();
        await expect(page.getByRole("textbox", { name: "数据 1 数值" })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "团队标题" })).toHaveCount(0);

        await quickJump.selectOption("projects");
        await expect(page).toHaveURL(/tab=projects/);
        await expect(page.getByRole("heading", { name: "项目治理" })).toBeVisible();
        await expect(page.getByRole("cell", { name: /校园 AI 助手/ })).toBeVisible();
        await expect(page.getByText("浙江大学 AI 社团")).toBeVisible();
        await expect(page.getByText("联系方式疑似失效")).toBeVisible();
        await expect(page.getByRole("button", { name: /下架项目：校园 AI 助手/ })).toBeVisible();

        await quickJump.selectOption("photos");
        await expect(page).toHaveURL(/tab=photos/);
        await expect(page.getByRole("heading", { name: "图片资源", exact: true })).toBeVisible();
        await expect(quickJump).toHaveValue("photos");
        await expect(page.getByText("2 条内容，全部状态")).toBeVisible();
        await expect(page.getByRole("search", { name: "搜索图片资源" })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "搜索图片资源" })).toBeVisible();
        await expect(page.getByRole("table")).toBeVisible();
        await expect(
            page.getByText("本页内容", { exact: true }).locator("xpath=../..")
        ).not.toHaveClass(/rect-surface|theme-admin-panel/);
        await expect(page.locator("table.theme-admin-table-sticky")).toBeVisible();
        const pendingRequest = page.waitForRequest((request) => {
            const url = new URL(request.url());
            return (
                url.pathname.endsWith("/api/photos") && url.searchParams.get("status") === "pending"
            );
        });
        await page.getByRole("button", { name: "筛选图片资源待审核" }).click();
        await pendingRequest;
        await expect(page.getByText("1 条内容，待审核")).toBeVisible();
        await expect(page.getByRole("button", { name: "重置筛选" })).toBeVisible();
        await page.getByRole("button", { name: "重置筛选" }).click();
        await expect(page.getByText("2 条内容，全部状态")).toBeVisible();
        await page.getByRole("textbox", { name: "搜索图片资源" }).fill("春日");
        await page.getByRole("button", { name: "执行搜索图片资源" }).click();
        await expect(page.getByText("2 条内容，全部状态，搜索“春日”")).toBeVisible();
        await expect(page.getByRole("heading", { name: "图片资源列表 (2)" })).toBeInViewport();
        await page.getByRole("button", { name: "重置筛选" }).click();
        await page.getByRole("checkbox", { name: "选择 紫金港春日影像" }).check();
        await expect(page.getByText("条当前页内容")).toBeVisible();
        await expect(page.getByRole("button", { name: "清除选择" })).toBeVisible();
        await page.getByRole("button", { name: "清除选择" }).click();
        await expect(page.getByText("条当前页内容")).toHaveCount(0);
        await expect
            .poll(() =>
                page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            )
            .toBe(true);

        await quickJump.selectOption("hackathon");
        await expect(page.getByRole("heading", { name: "黑客松运营管理" })).toBeVisible();
        await expect(page.getByRole("button", { name: "导出报名" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "报名" })).toHaveAttribute(
            "aria-selected",
            "true"
        );
        await expect(page.getByRole("heading", { name: "赛事日程与页面模板" })).toHaveCount(0);
        await expect(page.getByRole("combobox", { name: "按年级筛选" })).toBeVisible();
        await expect(page.getByRole("cell", { name: "张同学" })).toBeVisible();
        await page.getByRole("tab", { name: /赛事设置/ }).click();
        await expect(
            page.getByRole("heading", { name: /赛事(日程与页面|页面)模板/ })
        ).toBeVisible();
        await quickJump.selectOption("events");
        await expect(page.getByRole("heading", { name: "活动管理", exact: true })).toBeVisible();

        await quickJump.selectOption("intelligence");
        await expect(page).toHaveURL(/tab=intelligence/);
        await expect(page.getByRole("heading", { name: "AI 能力治理" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "活动元数据", exact: true })).toBeVisible();
        await expect(page.getByRole("tab", { name: "模型配置", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "AI 助手" })).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "AI 能力状态" })).toBeVisible();
        await expect(page.getByText("这段内部下一步不应出现在管理员主界面")).toHaveCount(0);
        await expect(page.getByText("这段内部路线图不应出现在管理员主界面")).toHaveCount(0);
        await page.getByRole("tab", { name: "活动元数据", exact: true }).click();
        await expect(page.getByRole("heading", { name: "活动元数据治理" })).toBeVisible();
        await page.getByRole("button", { name: "扫描" }).first().click();
        await expect(page.getByText(/^原因：标题和描述包含黑客松/)).toBeVisible();
        await expect(page.getByRole("button", { name: "选择高置信" })).toBeVisible();

        await page.getByRole("tab", { name: "模型配置", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Key 列表 (1)" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "添加 Key" })).toHaveCount(0);
        await page.getByRole("button", { name: "添加 Key" }).click();
        await expect(page.getByRole("heading", { name: "添加 Key" })).toBeVisible();
        await page.getByRole("button", { name: "收起添加" }).click();
        const deleteRequest = page.waitForRequest(
            (request) =>
                request.url().includes("/api/admin/ai-model-configs/1") &&
                request.method() === "DELETE"
        );
        await page.getByRole("button", { name: "删除配置" }).click();
        await expect(page.getByRole("heading", { name: "确认删除 Key 配置" })).toBeVisible();
        await page.getByRole("button", { name: "确认删除" }).click();
        await deleteRequest;

        await quickJump.selectOption("tags");
        await expect(page.getByRole("heading", { name: "标签管理" })).toBeVisible();
        await expect(page.getByText("校园")).toBeVisible();
        await page.getByPlaceholder("搜索标签").fill("活动");
        await expect(page.getByText("引用数 2")).toBeVisible();
        await expect
            .poll(() =>
                page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            )
            .toBe(true);

        await quickJump.selectOption("messages");
        await expect(page.getByRole("heading", { name: "留言中心" })).toBeVisible();
        await expect(page.getByText("访客 A")).toBeVisible();
        await page.getByRole("button", { name: "标记为已读" }).click();
        await expect(page.getByRole("button", { name: "标记为已读" })).toHaveCount(0);
        await expect
            .poll(() =>
                page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            )
            .toBe(true);
    });

    test("all right-hand admin workspaces use the compact shared structure", async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1050 });
        await installAdminMocks(page);
        await page.goto("/admin");

        const quickJump = page.getByRole("combobox", {
            name: "快速跳转到管理模块",
        });
        const tabs = [
            "overview",
            "pending",
            "events",
            "community",
            "articles",
            "photos",
            "videos",
            "music",
            "wechat-mp",
            "media-categories",
            "pages",
            "tags",
            "users",
            "partners",
            "attribution",
            "projects",
            "hackathon",
            "future-learning",
            "intelligence",
            "messages",
            "settings",
        ];

        for (const tab of tabs) {
            await quickJump.selectOption(tab);
            await expect(page).toHaveURL(new RegExp(`tab=${tab}`));
            const workspace = page.locator("main main");
            const pageHeader = workspace.locator("header").first();
            await expect(pageHeader).toBeVisible();
            await expect(pageHeader).not.toHaveClass(/rect-surface|theme-admin-panel/);
            await expect(workspace.locator("section.rect-surface")).toHaveCount(0);
        }
    });

    test("mobile admin drawer opens, closes, and navigates without body scroll leak", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await installAdminMocks(page);

        await page.goto("/admin");

        const menuButton = page.getByRole("button", { name: "打开管理导航" });
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        await expect(menuButton).toHaveAttribute("aria-expanded", "true");
        await expect(page.getByLabel("管理员导航")).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

        await page.getByRole("button", { name: "打开黑客松模块" }).click();
        await expect(page.getByRole("heading", { name: "黑客松运营管理" })).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
        await expect
            .poll(() =>
                page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            )
            .toBe(true);

        await menuButton.click();
        await page.getByRole("searchbox", { name: "搜索管理模块" }).fill("用户");
        await page.getByRole("button", { name: /打开.*账号与组织.*模块/ }).click();
        await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
        await expect(page.getByText("123").first()).toBeVisible();
        await expect
            .poll(() =>
                page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            )
            .toBe(true);

        await menuButton.click();
        await page.keyboard.press("Escape");
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    });
});
