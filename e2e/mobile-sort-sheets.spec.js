import { test, expect } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

const setupRoutes = async (page) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: { pagination_enabled: "true" } }),
  );
  await page.route("**/api/photos?**", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 301,
            title: "Campus Photo",
            url: null,
            tags: "",
            likes: 0,
            favorited: false,
            status: "approved",
          },
        ],
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    }),
  );
  await page.route("**/api/videos?**", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 401,
            title: "Campus Video",
            thumbnail: null,
            url: "",
            tags: "",
            likes: 0,
            favorited: false,
            status: "approved",
          },
        ],
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    }),
  );
  await page.route("**/api/music?**", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 501,
            title: "Campus Podcast",
            artist: "AI Community",
            cover: null,
            audio: "",
            duration: 60,
            tags: "",
            likes: 0,
            favorited: false,
            status: "approved",
          },
        ],
        pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
      },
    }),
  );
};

test.describe("shared mobile sort sheets", () => {
  for (const path of ["/gallery", "/videos"]) {
    test(`${path} closes mobile sort after changing sort`, async ({ page }) => {
      await setupRoutes(page);
      await page.setViewportSize(mobileViewport);
      await page.goto(path);

      const sortButton = page
        .getByRole("button", { name: /最新|最早|最热|标题|排序/ })
        .first();
      await sortButton.click();

      const sortDialog = page.getByRole("dialog", { name: "排序" });
      await expect(sortDialog).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.body.style.overflow))
        .toBe("hidden");

      await sortDialog.getByRole("button", { name: "最多喜欢" }).click();
      await expect(sortDialog).toHaveCount(0);
      await expect
        .poll(() => page.evaluate(() => document.body.style.overflow))
        .toBe("");

      await page
        .getByRole("button", { name: /最多喜欢|最热|最新|最早|标题|排序/ })
        .first()
        .click();
      await expect(sortDialog).toBeVisible();
      await page.getByRole("button", { name: "关闭" }).click();
      await expect(sortDialog).toHaveCount(0);
    });
  }
});
