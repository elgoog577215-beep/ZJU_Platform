import { expect, test } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

const user = {
  id: 7,
  username: "trier",
  nickname: "trier",
  role: "user",
  organization_cr: "",
  followers_count: 0,
  following_count: 0,
};

const profileCard = {
  id: 7,
  slogan: "",
  status: "",
  tags: [],
  social_links: [],
  cards: [],
};

const overview = {
  account: { account_type: "personal", review_permission: "normal" },
  permissionSummary: {
    accountType: "personal",
    reviewPermission: "normal",
    canBypassReview: false,
  },
  organizationWorkspace: { total: 0, managed: [] },
  identitySummary: { pending: 1 },
  contentSummary: { approved: 0, pending: 2, drafts: 0, rejected: 0 },
  outcomeSummary: { candidate: 1 },
  profileCompletion: {
    percent: 25,
    items: [
      { key: "profileCard", completed: false },
      { key: "activityProfile", completed: false },
      { key: "identity", completed: false },
    ],
  },
  nextActions: [
    { key: "check_submissions", target: "submissions", count: 2 },
    { key: "confirm_outcomes", target: "identity", count: 1 },
  ],
};

async function installUserCenterMocks(page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("token", "e2e-user-center-token");
  });

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: user }),
  );
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: { pagination_enabled: "true" } }),
  );
  await page.route("**/api/notifications**", (route) =>
    route.fulfill({
      json: { notifications: [], unreadCount: 0, unread_count: 0 },
    }),
  );
  await page.route("**/api/users/7/profile", (route) =>
    route.fulfill({ json: user }),
  );
  await page.route("**/api/users/7/resources", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/users/7/profile-card", (route) =>
    route.fulfill({ json: profileCard }),
  );
  await page.route("**/api/users/me/overview", (route) =>
    route.fulfill({ json: overview }),
  );
  await page.route("**/api/users/me/identity-claims", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/users/me/outcome-links**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/events/assistant/preferences", (route) =>
    route.fulfill({
      json: {
        college: "",
        division: "",
        grade: "",
        campus: "",
        availability: "",
        interestTags: [],
        preferredCategories: [],
        preferredBenefits: [],
        preferredFormat: "",
      },
    }),
  );
  await page.route("**/api/auth/wechat-miniapp/status", (route) =>
    route.fulfill({ json: { bound: false, unavailable: true } }),
  );
}

async function expectSectionNearTop(page, testId) {
  await expect(page.getByTestId(testId)).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByTestId(testId)
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThan(260);
}

test("mobile user center overview cards open the matching functional sections", async ({
  page,
}) => {
  await installUserCenterMocks(page);
  await page.setViewportSize(mobileViewport);
  await page.goto("/user/7/center?miniapp=1");

  await expect(page.getByTestId("user-system-stat-account")).toBeVisible();

  const initialScrollY = await page.evaluate(() => window.scrollY);
  await page.getByTestId("user-system-stat-organizations").click();

  await expect(page).toHaveURL(/tab=settings&settings=identity/);
  await expectSectionNearTop(page, "managed-profiles-section");
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(initialScrollY);

  await page.getByTestId("user-system-action-check_submissions").click();
  await expect(page).toHaveURL(/tab=submissions/);

  await page.getByTestId("user-system-completion-profileCard").click();
  await expect(page).toHaveURL(/tab=settings&settings=profile-card/);
  await expectSectionNearTop(page, "profile-card-editor-section");

  await page.getByTestId("user-system-completion-activityProfile").click();
  await expect(page).toHaveURL(/tab=settings&settings=activity-profile/);
  await expectSectionNearTop(page, "activity-profile-section");

  await page.getByTestId("user-system-completion-identity").click();
  await expect(page).toHaveURL(/tab=settings&settings=identity/);
  await expectSectionNearTop(page, "identity-claims-section");

  await page.getByTestId("user-system-action-confirm_outcomes").click();
  await expect(page).toHaveURL(/tab=settings&settings=identity/);
  await expectSectionNearTop(page, "outcome-claims-section");
});
