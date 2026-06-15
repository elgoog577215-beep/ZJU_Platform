import { test, expect } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

const events = [
  {
    id: 701,
    title: "AI Agent Product Workshop",
    description: "AI project workshop with comprehensive score information.",
    date: "2026-06-20 19:00",
    end_date: "2026-06-20 21:00",
    location: "Zijingang",
    organizer: "College of Computer Science",
    target_audience: "全校",
    score: "综合素质加分",
    volunteer_time: "",
    category: "lecture",
    image: null,
    likes: 0,
    favorited: false,
    status: "approved",
  },
  {
    id: 702,
    title: "Campus Volunteer Fair",
    description: "Volunteer recruitment fair for students.",
    date: "2026-06-21 09:00",
    end_date: "2026-06-21 12:00",
    location: "Yuquan",
    organizer: "Student Union",
    target_audience: "全校",
    score: "",
    volunteer_time: "2h",
    category: "volunteer",
    image: null,
    likes: 0,
    favorited: false,
    status: "approved",
  },
];

const setupRoutes = async (page) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: { pagination_enabled: "true" } }),
  );
  await page.route("**/api/events?**", (route) => {
    const url = new URL(route.request().url());
    const category = url.searchParams.get("category");
    const filteredEvents = category
      ? events.filter((event) => event.category === category)
      : events;

    route.fulfill({
      json: {
        data: filteredEvents,
        pagination: {
          total: filteredEvents.length,
          page: 1,
          limit: 6,
          totalPages: 1,
        },
      },
    });
  });
  await page.route("**/api/events/assistant/preferences", (route) =>
    route.fulfill({ status: 401, json: { error: "Unauthorized" } }),
  );
};

test.describe("events mobile sheets", () => {
  test("mobile filter sheet closes after use and restores page interaction", async ({
    page,
  }) => {
    await setupRoutes(page);
    await page.setViewportSize(mobileViewport);
    await page.goto("/events");

    await page.getByRole("button", { name: "筛选" }).click();
    const filterDialog = page.getByRole("dialog", { name: "筛选活动" });
    await expect(filterDialog).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");

    await page.getByRole("button", { name: "讲座", exact: true }).click();
    await page.getByRole("button", { name: "完成" }).click();

    await expect(filterDialog).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");

    await expect(page.getByText("AI Agent Product Workshop")).toBeVisible();
    await expect(page.getByRole("button", { name: "筛选" })).toBeVisible();
    await page.getByRole("button", { name: "筛选" }).click();
    await expect(filterDialog).toBeVisible();
    await page.getByRole("button", { name: "关闭" }).click();
    await expect(filterDialog).toHaveCount(0);
  });

  test("mobile filter and sort sheets close with browser back", async ({
    page,
  }) => {
    await setupRoutes(page);
    await page.setViewportSize(mobileViewport);
    await page.goto("/events");

    await page.getByRole("button", { name: "筛选" }).click();
    const filterDialog = page.getByRole("dialog", { name: "筛选活动" });
    await expect(filterDialog).toBeVisible();
    await page.goBack();
    await expect(filterDialog).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");

    await page.getByRole("button", { name: /最|最新|最晚|排序/ }).click();
    const sortDialog = page.getByRole("dialog", { name: "排序" });
    await expect(sortDialog).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");
    await page.goBack();
    await expect(sortDialog).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");
  });
});
