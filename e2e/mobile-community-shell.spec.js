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

const installCommunityMocks = async (page, currentNewsItem = newsItem) => {
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
    route.fulfill({ json: currentNewsItem }),
  );
  await page.route("**/api/news?**", (route) =>
    route.fulfill({
      json: {
        data: [currentNewsItem],
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

test("miniapp news detail scrolls to the bottom without locking body", async ({ page }) => {
  const longNewsItem = {
    ...newsItem,
    content_blocks: JSON.stringify(
      Array.from({ length: 24 }, (_, index) => ({
        type: "text",
        style: index % 5 === 0 ? "heading" : "paragraph",
        text:
          index % 5 === 0
            ? `Campus AI News Section ${index + 1}`
            : "A long mini program detail paragraph used to verify that fixed overlays remain touch-scrollable all the way to the bottom.",
      })),
    ),
  };

  await installCommunityMocks(page, longNewsItem);
  await page.setViewportSize(mobileViewport);
  await page.goto("/articles?postTab=news&miniapp=1&miniapp_nav_inset=112");
  await page.getByRole("button", { name: /Campus AI News/ }).click();

  const detailDialog = page.getByRole("dialog", { name: "Campus AI News" });
  await expect(detailDialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");

  const scrollRoot = page.locator(".community-detail-modal-root");
  const before = await scrollRoot.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);

  await page.mouse.move(195, 560);
  await page.mouse.wheel(0, 900);
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(before.scrollTop);

  await page.mouse.wheel(0, 8000);
  await expect
    .poll(() =>
      scrollRoot.evaluate(
        (element) =>
          element.scrollTop + element.clientHeight >=
          element.scrollHeight - 8,
      ),
    )
    .toBeTruthy();
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
