import { expect, test } from "@playwright/test";

const partner = {
  id: 901,
  category: "organization",
  name: "浙江大学学生会",
  name_en: "ZJU Student Union",
  description: "链接学生组织与校园活动的合作社团。",
  description_en: "A campus organization that connects student groups and events.",
  cooperation_direction: "学生活动共创与校园传播",
  cooperation_direction_en: "Student activity co-creation and campus outreach",
  event_organizer_aliases: ["浙江大学学生会", "ZJU Student Union", "校学生会"],
  sort_order: 10,
  enabled: true,
  featured: true,
  link_url: "https://example.com/student-union",
};

const manyPartners = Array.from({ length: 14 }, (_, index) => ({
  ...partner,
  id: 901 + index,
  name: index === 13 ? "Overflow Campus Org" : `${partner.name} ${index + 1}`,
  name_en: index === 13 ? "Overflow Campus Org" : `Partner Org ${index + 1}`,
  description: index === 13 ? "Directory-only organization" : partner.description,
  cooperation_direction:
    index === 13 ? "Directory search coverage" : partner.cooperation_direction,
  event_organizer_aliases:
    index === 13 ? ["Overflow Campus Org"] : [`${partner.name} ${index + 1}`],
  sort_order: 10 + index,
}));

const baseEvents = [
  {
    id: 7101,
    title: "学生会专场分享会",
    description: "活动协作与校园传播经验分享。",
    date: "2026-06-20T10:00:00.000Z",
    location: "紫金港校区",
    organizer: "浙江大学学生会",
    category: "lecture",
    target_audience: "all",
    status: "approved",
  },
  {
    id: 7102,
    title: "校园公益行动",
    description: "志愿服务主题活动。",
    date: "2026-06-22T14:00:00.000Z",
    location: "玉泉校区",
    organizer: "浙江大学红十字会",
    category: "volunteer",
    target_audience: "all",
    status: "approved",
  },
];

const installEventsMocks = async (page, partners = [partner]) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("ui_mode_v2", "day");
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/settings") {
      return route.fulfill({
        json: {
          site_title: "拓途浙享 | TUOTUZJU",
          pagination_enabled: "false",
          language: "zh",
        },
      });
    }

    if (path === "/auth/me") {
      return route.fulfill({ status: 401, json: { error: "unauthorized" } });
    }

    if (path === "/ecosystem-partners") {
      return route.fulfill({ json: partners });
    }

    if (path === "/events" && request.method() === "GET") {
      const organizerAny = url.searchParams.get("organizer_any");
      const terms = organizerAny
        ? organizerAny
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
      const data = terms.length
        ? baseEvents.filter((event) => terms.includes(event.organizer))
        : baseEvents;

      return route.fulfill({
        json: {
          data,
          pagination: { page: 1, total: data.length, totalPages: 1 },
        },
      });
    }

    return route.fulfill({
      json: { data: [], pagination: { page: 1, total: 0, totalPages: 1 } },
    });
  });
};

test.describe("events organization partner wall", () => {
  test("desktop card opens details and applies organizer_any filtering", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 960 });
    await installEventsMocks(page);

    await page.goto("/events");

    await expect(page.getByTestId("organization-partner-wall")).toBeVisible();
    await expect(
      page.getByTestId("organization-partner-card-desktop-901"),
    ).toBeVisible();
    await expect(
      page.getByTestId("organization-partner-card-mobile-901"),
    ).toBeHidden();

    await page.getByTestId("organization-partner-card-desktop-901").click();
    const modal = page.getByTestId("organization-partner-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("学生活动共创与校园传播")).toBeVisible();
    await expect(modal.getByText("学生会专场分享会")).toBeVisible();

    const filteredRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname.endsWith("/api/events") &&
        url.searchParams.get("limit") === "12" &&
        url.searchParams.get("organizer_any")?.includes("浙江大学学生会")
      );
    });
    await page.getByTestId("organization-partner-view-all").click();
    const request = await filteredRequest;
    expect(new URL(request.url()).searchParams.get("organizer_any")).toContain(
      "校学生会",
    );
    await expect(page.getByTestId("organization-partner-active-filter")).toContainText(
      "浙江大学学生会",
    );
  });

  test("mobile renders a compact horizontal partner rail", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installEventsMocks(page);

    await page.goto("/events");

    const wall = page.getByTestId("organization-partner-wall");
    await expect(wall).toBeVisible();
    await expect(page.getByTestId("organization-partner-card-mobile-901")).toBeVisible();
    await expect(
      page.getByTestId("organization-partner-card-desktop-901"),
    ).toBeHidden();

    const box = await wall.boundingBox();
    expect(box?.height ?? 999).toBeLessThan(190);

    await page.getByTestId("organization-partner-card-mobile-901").click();
    await expect(page.getByTestId("organization-partner-modal")).toBeVisible();
  });

  test("large partner sets stay capped on page and open searchable directory", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 960 });
    await installEventsMocks(page, manyPartners);

    await page.goto("/events");

    await expect(page.getByTestId("organization-partner-wall")).toBeVisible();
    await expect(
      page.locator('[data-testid^="organization-partner-card-desktop-"]'),
    ).toHaveCount(10);
    await expect(
      page.getByTestId("organization-partner-card-desktop-914"),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "查看全部" }).click();
    const directory = page.getByTestId("organization-partner-directory");
    await expect(directory).toBeVisible();
    await expect(directory.getByText("Overflow Campus Org")).toBeVisible();

    await directory
      .getByPlaceholder("搜索社团、简介或合作方向")
      .fill("Overflow");
    await expect(directory.getByText("Overflow Campus Org")).toBeVisible();
    await expect(directory.getByText("Partner Org 1")).toHaveCount(0);
  });
});
