import { test, expect } from "@playwright/test";

const event = {
  id: 901,
  title: "AI Agent Product Workshop",
  description: "AI project workshop with comprehensive score information.",
  date: "2026-06-01 19:00",
  end_date: "2026-06-01 21:00",
  location: "Zijingang",
  organizer: "College of Computer Science",
  target_audience: "All students",
  score: "comprehensive score",
  volunteer_time: "",
  category: "lecture",
  image: null,
};

const assistantResponse = {
  type: "recommend",
  scope: "mixed_future",
  recommendationMode: "future",
  coverage: { upcoming: 2, ongoing: 0, past: 1, unknown: 0, total: 3 },
  summary: "已按 AI、紫金港和综测优先排序。",
  understoodIntent: {
    understood: ["主题：AI", "地点：Zijingang", "希望有综测信息"],
    profile: { signals: ["参考画像：偏好讲座"] },
  },
  reasoningTrace: {
    rankingBasis: ["硬约束优先", "AI 主题", "综测收益"],
    uncertainty: ["未指定具体学院年级"],
    scoringFactors: {
      hardConstraints: true,
      topicCategory: true,
      userProfile: true,
    },
  },
  modelStatus: {
    used: true,
    fallbackUsed: false,
    tasks: ["event_recommendation_intent", "event_recommendation_rerank"],
  },
  recommendations: [
    {
      id: event.id,
      event,
      reason: "匹配 AI 项目实践、紫金港地点和综测收益。",
      confidence: 0.91,
      matchSignals: ["主办方/学院匹配", "校区/地点匹配", "收益匹配"],
      score: 96,
      isHistorical: false,
      diagnostics: {
        deterministicScore: 70,
        semanticScore: 96,
        hardConstraintScore: 54,
        hardConstraintPossible: 68,
        hardConstraintRatio: 0.794,
        hardConstraintMisses: ["面向对象"],
        scope: "upcoming",
      },
      opportunityMatch: {
        stage: "trusted_decision_loop_v1",
        matched: [
          "主办方/学院匹配：College of Computer Science",
          "校区/地点匹配：Zijingang",
          "收益匹配：综测/加分",
          "行动证据显示你更常选择讲座",
        ],
        missing: ["面向对象", "收益：志愿时长"],
        uncertainty: ["未指定具体学院年级", "时间偏好不明确"],
        decisionHint: "优先推荐「AI Agent Product Workshop」，因为它更完整满足你明确提出的条件。",
        feedbackLearning: { used: true, signals: ["行动证据显示你更常选择讲座"] },
      },
    },
  ],
};

const setupRoutes = async (page) => {
  await page.route("**/api/settings/public", (route) =>
    route.fulfill({ json: { pagination_enabled: "true" } }),
  );
  await page.route("**/api/events?**", (route) =>
    route.fulfill({
      json: {
        data: [event],
        pagination: { totalPages: 1, page: 1, total: 1 },
      },
    }),
  );
  await page.route(`**/api/events/${event.id}`, (route) =>
    route.fulfill({ json: event }),
  );
  await page.route("**/api/events/*/view", (route) =>
    route.fulfill({ json: { views: 12 } }),
  );
  await page.route("**/api/events/assistant", (route) =>
    route.fulfill({ json: assistantResponse }),
  );
  await page.route("**/api/events/assistant/feedback", (route) =>
    route.fulfill({ json: { success: true } }),
  );
};

test.describe("event assistant flow", () => {
  test("desktop assistant shows recommendation, diagnostics, feedback reasons, and opens detail", async ({ page }) => {
    await setupRoutes(page);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/events");

    await page.getByRole("button", { name: /AI/ }).click();
    await expect(page.getByRole("button", { name: "技能作品集" })).toBeVisible();
    await page.getByRole("button", { name: "我的推荐偏好" }).click();
    await expect(page.getByRole("button", { name: "技能成长" })).toBeVisible();
    await expect(page.getByRole("button", { name: "社交放松" })).toBeVisible();
    await page.getByPlaceholder(/比如/).fill("AI project at Zijingang with score");
    await page.getByRole("button", { name: "开始推荐" }).click();

    await expect(page.getByText("已按 AI、紫金港和综测优先排序。")).toBeVisible();
    await expect(page.getByText("硬约束优先")).toBeVisible();
    await expect(page.getByText("硬约束 54/68")).toBeVisible();
    await expect(page.getByText(/优先推荐/)).toBeVisible();
    await expect(page.getByText("匹配：行动证据显示你更常选择讲座")).toBeVisible();
    await expect(page.getByText("匹配：收益匹配：综测/加分")).toBeVisible();
    await expect(page.getByText("缺失：面向对象")).toBeVisible();
    await expect(page.getByText("缺失：收益：志愿时长")).toBeVisible();
    await expect(page.getByText("不确定：时间偏好不明确")).toBeVisible();
    await expect(page.getByText("已参考反馈")).toBeVisible();

    await page.getByRole("button", { name: "推荐不适合我" }).click();
    await expect(page.getByRole("button", { name: "时间不合适" })).toBeVisible();
    await page.getByRole("button", { name: "时间不合适" }).click();

    await page.getByRole("button", { name: new RegExp(event.title) }).click();
    await expect(
      page.getByRole("dialog", { name: event.title }).getByRole("heading", {
        name: event.title,
      }),
    ).toBeVisible();
  });

  test("mobile assistant keeps the same recommendation and feedback flow", async ({ page }) => {
    await setupRoutes(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/events");

    await page.getByRole("button", { name: /AI 活动助手/ }).click();
    await expect(page.getByRole("button", { name: "技能作品集" })).toBeVisible();
    await page.getByPlaceholder(/比如/).fill("AI project at Zijingang with score");
    await page.getByRole("button", { name: "开始推荐" }).click();

    await expect(page.getByRole("dialog", { name: "AI 活动助手" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(event.title) })).toBeVisible();
    await expect(page.getByText("硬约束 54/68")).toBeVisible();
    await expect(page.getByText(/优先推荐/)).toBeVisible();
    await expect(page.getByText("匹配：收益匹配：综测/加分")).toBeVisible();

    await page.getByRole("button", { name: "推荐不适合我" }).click();
    await expect(page.getByRole("button", { name: "地点不合适" })).toBeVisible();
  });
});
