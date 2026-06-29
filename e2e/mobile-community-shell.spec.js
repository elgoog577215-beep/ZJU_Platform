import { expect, test } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

const newsItem = {
  id: 901,
  title: "Campus AI News",
  excerpt: "A short digest for builders.",
  content: "A short digest for builders with enough content to open detail.",
  content_blocks: JSON.stringify([
    { type: "text", style: "paragraph", text: "A short digest for builders with enough content to open detail." },
  ]),
  source_name: "AI Community",
  source_url: "https://example.com/news",
  hot_score: 18,
  status: "approved",
  created_at: "2026-06-20 10:00:00",
};

const installCommunityMocks = async (page) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, json: { error: "Unauthorized" } }),
  );
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: { pagination_enabled: "true" } }),
  );
  await page.route("**/api/notifications**", (route) =>
    route.fulfill({ json: { notifications: [], unreadCount: 0, unread_count: 0 } }),
  );
  await page.route("**/api/news/901", (route) =>
    route.fulfill({ json: newsItem }),
  );
  await page.route("**/api/news?**", (route) =>
    route.fulfill({
      json: {
        data: [newsItem],
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    }),
  );
  await page.route("**/api/articles?**", (route) =>
    route.fulfill({ json: { data: [], pagination: { total: 0, page: 1, limit: 3, totalPages: 0 } } }),
  );
  await page.route("**/api/community/posts?**", (route) =>
    route.fulfill({ json: { data: [], pagination: { total: 0, page: 1, limit: 3, totalPages: 0 } } }),
  );
};

test("mobile profile tab opens auth modal for signed-out users", async ({ page }) => {
  await installCommunityMocks(page);
  await page.setViewportSize(mobileViewport);
  await page.goto("/events");

  const profileTab = page.getByRole("button", { name: "我的" });
  await expect(profileTab).toBeVisible();
  await expect(profileTab).not.toHaveAttribute("aria-current", "page");

  await profileTab.click();
  await expect(page.getByRole("dialog", { name: "欢迎回来" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe("/events");

  await page.goto("/me");
  await expect(page.getByRole("button", { name: "我的" })).not.toHaveAttribute("aria-current", "page");
});

test("mobile news tab opens detail fullscreen and closes with browser back", async ({ page }) => {
  await installCommunityMocks(page);
  await page.setViewportSize(mobileViewport);
  await page.goto("/articles?postTab=news");

  await expect(page.getByRole("tab", { name: /新闻热点/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: /Campus AI News/ }).click();

  const detailDialog = page.getByRole("dialog", { name: "Campus AI News" });
  await expect(detailDialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("hidden");

  await page.goBack();
  await expect(detailDialog).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");
  await expect(page.getByRole("navigation", { name: "移动端底部导航" })).toBeVisible();
});
