import { expect, test } from "@playwright/test";

const adminUser = {
  id: 1,
  username: "seed_admin",
  role: "admin",
};

const organizationPartner = {
  id: 901,
  category: "organization",
  name: "浙江大学学生会",
  name_en: "ZJU Student Union",
  description: "链接学生组织与校园活动的合作社团。",
  description_en: "Connects student organizations with campus events.",
  cooperation_direction: "学生活动共创与校园传播",
  cooperation_direction_en: "Student activity co-creation and campus outreach",
  event_organizer_aliases: ["浙江大学学生会", "ZJU Student Union"],
  logo_url: "",
  dark_logo_url: "",
  link_url: "https://example.com/student-union",
  sort_order: 10,
  enabled: true,
  featured: true,
};

const installAdminPartnerMocks = async (page, onUpdate) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("token", "mock-admin-token");
    localStorage.setItem("ui_mode_v2", "day");
  });

  await page.route("**/api/**", async (route) => {
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

    if (path === "/admin/ecosystem-partners" && request.method() === "GET") {
      return route.fulfill({ json: [organizationPartner] });
    }

    if (
      path === "/admin/ecosystem-partners/901" &&
      request.method() === "PUT"
    ) {
      const payload = JSON.parse(request.postData() || "{}");
      onUpdate(payload);
      return route.fulfill({
        json: { ...organizationPartner, ...payload, id: organizationPartner.id },
      });
    }

    if (request.method() === "GET") {
      return route.fulfill({
        json: { data: [], pagination: { page: 1, total: 0, totalPages: 1 } },
      });
    }

    return route.fulfill({ json: { success: true } });
  });
};

test("admin ecosystem partners editor submits organization metadata fields", async ({
  page,
}) => {
  let updatePayload = null;
  await page.setViewportSize({ width: 1366, height: 960 });
  await installAdminPartnerMocks(page, (payload) => {
    updatePayload = payload;
  });

  await page.goto("/admin?tab=partners");

  await expect(page.getByRole("heading", { name: "生态伙伴管理" })).toBeVisible();
  await expect(page.getByText("ZJU Student Union")).toBeVisible();
  await expect(
    page.getByRole("table").getByText("学生活动共创与校园传播"),
  ).toBeVisible();

  await page.getByRole("button", { name: "编辑合作方" }).click();
  await expect(page.getByRole("heading", { name: "编辑合作方" })).toBeVisible();
  await expect(page.getByTestId("ecosystem-partner-name-en-input")).toHaveValue(
    "ZJU Student Union",
  );
  await expect(page.getByTestId("ecosystem-partner-aliases-input")).toHaveValue(
    "浙江大学学生会\nZJU Student Union",
  );

  await page
    .getByTestId("ecosystem-partner-name-en-input")
    .fill("ZJU Student Union Updated");
  await page
    .getByTestId("ecosystem-partner-cooperation-direction-input")
    .fill("学生活动共创、志愿服务与校园传播");
  await page
    .getByTestId("ecosystem-partner-aliases-input")
    .fill("浙江大学学生会\nZJU Student Union\n校学生会");

  await page.getByRole("button", { name: "保存修改" }).click();

  await expect.poll(() => updatePayload).not.toBeNull();
  expect(updatePayload).toMatchObject({
    category: "organization",
    name: "浙江大学学生会",
    name_en: "ZJU Student Union Updated",
    cooperation_direction: "学生活动共创、志愿服务与校园传播",
    enabled: true,
    featured: true,
  });
  expect(updatePayload.event_organizer_aliases).toEqual([
    "浙江大学学生会",
    "ZJU Student Union",
    "校学生会",
  ]);
});
