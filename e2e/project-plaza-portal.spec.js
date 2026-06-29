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

const quietProject = {
  ...project,
  id: 8803,
  title: "Archive Notes",
  intro: "A quieter project card.",
  progress: "pause",
  need_tags: [],
  tech_tags: ["Docs"],
  likes: 0,
  views: 1,
  created_at: "2026-06-28T00:00:00.000Z",
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

  await page.route("**/api/notifications**", (route) =>
    route.fulfill({ json: { notifications: [], unread_count: 0 } }),
  );

  await page.route("**/api/favorites/check**", (route) =>
    route.fulfill({ json: { favorited: false } }),
  );

  await page.route("**/api/projects**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const method = route.request().method();

    if (pathname.endsWith(`/api/projects/${project.id}`)) {
      return route.fulfill({ json: project });
    }

    if (method === "POST") {
      return route.fulfill({
        status: 201,
        json: {
          ...project,
          id: 8802,
          title: "Campus Archive Kit",
          intro: "A new project from the create form.",
          likes: 0,
          views: 0,
        },
      });
    }

    return route.fulfill({
      json: {
        items: [quietProject, project],
        page: 1,
        limit: 24,
        total: 2,
        totalPages: 1,
      },
    });
  });

  await page.route("**/api/favorites/toggle", (route) =>
    route.fulfill({ json: { favorited: true, likes: 4 } }),
  );
};

test("project plaza mobile detail uses body portal and restores scroll lock", async ({
  page,
}) => {
  await installProjectMocks(page);
  await page.setViewportSize(mobileViewport);
  await page.goto("/projects");

  await page.getByRole("button", { name: `${project.title} 查看详情` }).click();
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

test("project plaza supports authenticated publish and favorite", async ({ page }) => {
  await installProjectMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem("token", "test-token");
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        id: 7,
        username: "builder",
        nickname: "Builder",
        role: "user",
      },
    }),
  );

  await page.goto("/projects");
  await page.getByRole("button", { name: "发布项目" }).click();
  await page.getByPlaceholder("例如：校园二手书漂流").fill("Campus Archive Kit");
  await page.getByPlaceholder("一句话说清楚它是什么").fill("A new project from the create form.");
  await page.getByRole("button", { name: "发布到广场" }).click();

  await expect(page.getByText("Campus AI Builder")).toBeVisible();
  await page.getByRole("button", { name: `${project.title} 查看详情` }).click();
  const dialog = page.getByRole("dialog", { name: project.title });
  await dialog.getByRole("button", { name: "收藏" }).click();
  await expect(dialog.getByRole("button", { name: "取消收藏" })).toBeVisible();
  await expect(page.getByText("4 收藏")).toBeVisible();
});

test("project plaza ranks opportunity cards by match score", async ({ page }) => {
  await installProjectMocks(page);
  await page.goto("/projects");

  await expect(page.getByText("机会雷达")).toBeVisible();
  await expect(page.getByText("1 个项目正在找同伴")).toBeVisible();
  await expect(page.getByRole("button", { name: "推荐" })).toHaveClass(/on/);

  const titles = page.locator(".ppp-title");
  await expect(titles.first()).toHaveText(project.title);

  await page.getByRole("button", { name: "最新" }).click();
  await expect(titles.first()).toHaveText(quietProject.title);
});
