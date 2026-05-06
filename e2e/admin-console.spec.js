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

const aiOverviewPayload = {
  health: {
    eventCount: 12,
    uncategorizedEventCount: 3,
    enabledModelConfigCount: 1,
  },
  recentRuns: [],
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
          site_title: "拓途浙享 | TUOTUZJU",
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

    if (path === "/admin/ai-assistant/overview") {
      return route.fulfill({ json: aiOverviewPayload });
    }

    if (
      path === "/admin/ai-assistant/event-governance/scan" &&
      request.method() === "POST"
    ) {
      return route.fulfill({ json: aiScanPayload });
    }

    if (
      path === "/admin/ai-assistant/event-governance/apply" &&
      request.method() === "POST"
    ) {
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

    if (
      path === "/admin/ai-model-configs/1" &&
      request.method() === "DELETE"
    ) {
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
  test("admin access gate keeps unauthenticated users in admin context", async ({
    page,
  }) => {
    await page.route("**/api/settings", (route) =>
      route.fulfill({
        json: {
          site_title: "拓途浙享 | TUOTUZJU",
          pagination_enabled: "false",
          language: "zh",
        },
      }),
    );

    await page.goto("/admin?tab=photos");

    await expect(page).toHaveURL(/\/admin\?tab=photos/);
    await expect(
      page.getByRole("heading", { name: "管理员登录" }),
    ).toBeVisible();
    await expect(page.getByLabel("账号")).toHaveValue("123");
    await expect(
      page.getByRole("button", { name: "进入管理员后台" }),
    ).toBeVisible();
  });

  test("desktop overview, resource navigation, and hackathon manager render refined controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1050 });
    await installAdminMocks(page);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\?tab=overview/);

    await expect(
      page.getByRole("heading", { name: "管理控制台" }),
    ).toBeVisible();
    await expect(page.getByText("今日待办")).toBeVisible();
    await expect(page.getByText("当前模块")).toBeVisible();
    await expect(page.getByRole("heading", { name: "内容资产" })).toBeVisible();
    const quickJump = page.getByRole("combobox", {
      name: "快速跳转到管理模块",
    });
    await expect(quickJump).toHaveValue("overview");

    await quickJump.selectOption("photos");
    await expect(page).toHaveURL(/tab=photos/);
    await expect(
      page.getByRole("heading", { name: "图片资源", exact: true }),
    ).toBeVisible();
    await expect(quickJump).toHaveValue("photos");
    await expect(
      page.getByText("当前筛选“全部状态”共 2 条，本页显示 2 条"),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator("table.theme-admin-table-sticky")).toBeVisible();
    const pendingRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname.endsWith("/api/photos") &&
        url.searchParams.get("status") === "pending"
      );
    });
    await page.getByRole("button", { name: "待审核" }).click();
    await pendingRequest;
    await expect(
      page.getByText("当前筛选“待审核”共 1 条，本页显示 1 条"),
    ).toBeVisible();
    await page.getByRole("button", { name: "全部状态" }).click();
    await page.getByPlaceholder("搜索标题或标签").fill("春日");
    await page.getByRole("button", { name: "搜索" }).click();
    await expect(page.getByText("搜索“春日”")).toBeVisible();
    await page.getByRole("button", { name: "查看列表" }).click();
    await expect(
      page.getByRole("heading", { name: "图片资源列表" }),
    ).toBeInViewport();
    await page.getByRole("button", { name: /清空/ }).click();
    await page.getByRole("checkbox", { name: "选择 紫金港春日影像" }).check();
    await expect(page.getByText("条当前页内容")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const backToTop = page.getByRole("button", { name: "回到管理员顶部" });
    await expect(backToTop).toBeVisible();
    await backToTop.click();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(160);

    await quickJump.selectOption("hackathon");
    await expect(
      page.getByRole("heading", { name: "黑客松报名管理" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "导出 CSV" })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "按年级筛选" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "张同学" })).toBeVisible();
    await page.getByRole("button", { name: "跳转到上一个管理模块" }).click();
    await expect(
      page.getByRole("heading", { name: "活动管理", exact: true }),
    ).toBeVisible();

    await quickJump.selectOption("intelligence");
    await expect(page).toHaveURL(/tab=intelligence/);
    await expect(
      page.getByRole("heading", { name: "治理与模型配置" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "治理建议", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "模型配置", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI 助手" })).toHaveCount(0);
    await page.getByRole("button", { name: "扫描" }).first().click();
    await expect(page.getByText(/^原因：标题和描述包含黑客松/)).toBeVisible();

    await page.getByRole("button", { name: "模型配置", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Key 列表 (1)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "添加 Key" })).toHaveCount(0);
    await page.getByRole("button", { name: "添加 Key" }).click();
    await expect(page.getByRole("heading", { name: "添加 Key" })).toBeVisible();
    await page.getByRole("button", { name: "收起添加" }).click();
    const deleteRequest = page.waitForRequest((request) =>
      request.url().includes("/api/admin/ai-model-configs/1") &&
      request.method() === "DELETE",
    );
    await page.getByRole("button", { name: "删除配置" }).click();
    await expect(
      page.getByRole("heading", { name: "确认删除 Key 配置" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "确认删除" }).click();
    await deleteRequest;

    await quickJump.selectOption("tags");
    await expect(page.getByRole("heading", { name: "标签管理" })).toBeVisible();
    await expect(page.getByText("校园")).toBeVisible();
    await page.getByPlaceholder("搜索标签").fill("活动");
    await expect(page.getByText("引用数 2")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    await quickJump.selectOption("messages");
    await expect(page.getByRole("heading", { name: "留言中心" })).toBeVisible();
    await expect(page.getByText("访客 A")).toBeVisible();
    await page.getByRole("button", { name: "标记为已读" }).click();
    await expect(page.getByRole("button", { name: "标记为已读" })).toHaveCount(
      0,
    );
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
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
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    await page.getByRole("button", { name: "黑客松", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "黑客松报名管理" }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    await menuButton.click();
    await page.getByRole("button", { name: /用户/ }).click();
    await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
    await expect(page.getByText("123").first()).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    await menuButton.click();
    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});
