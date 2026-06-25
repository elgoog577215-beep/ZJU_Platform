import { expect, test } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

const project = {
  id: 8801,
  user_id: 100,
  owner_name: "ZJU Builder",
  owner_avatar: null,
  title: "Campus AI Builder",
  intro: "A compact campus AI project card.",
  content: "Build together.\nShip together.",
  progress: "dev",
  need_tags: ["缺人", "缺设计"],
  tech_tags: ["React", "AI"],
  repo_url: "https://github.com/example/campus-ai-builder",
  cover_url: null,
  images: [],
  status: "published",
  likes: 3,
  views: 12,
  created_at: "2026-06-25T00:00:00.000Z",
  updated_at: "2026-06-25T00:00:00.000Z",
  contact_locked: true,
  contact_wechat: null,
  contact_email: null,
};

const installProjectMocks = async (page) => {
  await page.route("**/api/settings", (route) =>
    route.fulfill({
      json: {
        site_title: "拓途浙享 | TUOTUZJU",
        pagination_enabled: "true",
        language: "zh",
      },
    }),
  );

  await page.route("**/api/projects**", (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith(`/api/projects/${project.id}`)) {
      return route.fulfill({ json: project });
    }

    return route.fulfill({
      json: {
        items: [project],
        page: 1,
        limit: 24,
        total: 1,
        totalPages: 1,
      },
    });
  });
};

test("project plaza mobile detail uses body portal and restores scroll lock", async ({
  page,
}) => {
  await installProjectMocks(page);
  await page.setViewportSize(mobileViewport);
  await page.goto("/projects");

  await page.getByRole("heading", { name: project.title }).click();
  const closeButton = page.getByRole("button", { name: "关闭" });
  await expect(closeButton).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const scrim = document.querySelector(".ppp-scrim");
        return {
          parentIsBody: scrim?.parentElement === document.body,
          bodyOverflow: document.body.style.overflow,
          topClass: document.elementFromPoint(
            window.innerWidth / 2,
            window.innerHeight / 2,
          )?.closest(".ppp-scrim")?.className || "",
        };
      }),
    )
    .toEqual({
      parentIsBody: true,
      bodyOverflow: "hidden",
      topClass: "ppp-root ppp-scrim",
    });

  await closeButton.click();
  await expect(closeButton).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");
});
