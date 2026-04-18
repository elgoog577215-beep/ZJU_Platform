import { test, expect } from "@playwright/test";

/**
 * E2E smoke for community-identity-and-follow-notifications.
 *
 * Covers the 7 scenarios in openspec change tasks.md Section 11:
 *   11.1 author_name falls back to username, then updates to nickname after set
 *   11.2 nickname collision returns 409 + surfaces toast, state unchanged
 *   11.3 follow triggers new_content notification (fan-out on publish)
 *   11.4 anonymous help post skips fan-out and is hidden from author profile
 *   11.5 self-follow rejected with 400 (POST and DELETE)
 *   11.6 detail page avatar click navigates to /user/:id with history restore
 *   11.7 profile tab + scroll memory survives detail navigation and back
 *
 * Conventions:
 *  - API fixtures handle user registration, nickname, follow, content creation
 *    so UI only verifies behavior-level transitions (fast + stable).
 *  - Usernames are randomized with `test_identity_{scenario}_{ts}_{rand}` so
 *    repeated local runs do not collide in the shared SQLite DB.
 *  - Selectors follow the Playwright priority:
 *      getByRole > getByText > getByLabel > getByTestId > CSS selector
 *  - No page.waitForTimeout; use expect(...).toBeVisible({ timeout }) or
 *    expect.poll for eventual-consistency paths (notification fan-out).
 *
 * Known dependencies (acceptance-driver semantics):
 *  - 11.2 expects a 409 status from PUT /api/users/:id with body.error matching
 *    /该昵称已被使用/ and a toast in the UI. The current backend silently sets
 *    the new nickname (no uniqueness check) — this test fails until the change
 *    adds the uniqueness validator. That is intentional for spec-first verify.
 *  - 11.3 expects a `new_content` notification delivered within a polling
 *    window after the followee publishes. The fan-out worker is part of this
 *    openspec change and is not yet wired; the test therefore polls up to
 *    ~90s so the real implementation has room to breathe.
 *  - 11.4 expects that an anonymous help post does not trigger fan-out and is
 *    not surfaced on the author's public profile "求助" tab. Tab introduction
 *    (求助/图片/文章) is also part of this change.
 *  - 11.5 the exact reject string — the repo currently returns English
 *    "Cannot follow yourself" while the openspec spec says "不能关注自己".
 *    We accept either to avoid coupling to wording pending the rename PR.
 *  - 11.6 / 11.7 require the avatar-click-to-profile affordance and scroll
 *    memory behavior introduced by this change; tests act as acceptance gates.
 */

const BASE_API = "/api";

const rand = () => Math.random().toString(36).slice(2, 8);
const ts = () => Date.now();
const makeUsername = (scenario) =>
  `test_identity_${scenario}_${ts()}_${rand()}`;
const PASSWORD = "pw_test_1234";

/** Register a user via API, returns { id, username, token }. */
async function registerUser(apiRequest, scenario) {
  const username = makeUsername(scenario);
  const resp = await apiRequest.post(`${BASE_API}/auth/register`, {
    data: { username, password: PASSWORD },
  });
  expect(resp.ok(), await resp.text()).toBeTruthy();
  const body = await resp.json();
  // register returns { token, user: { id, username, role } }
  return { id: body.user.id, username: body.user.username, token: body.token };
}

/** Set nickname for a user (returns raw response so caller can inspect). */
async function setNickname(apiRequest, user, nickname) {
  return apiRequest.put(`${BASE_API}/users/${user.id}`, {
    headers: { Authorization: `Bearer ${user.token}` },
    data: { nickname },
  });
}

/** Follow / unfollow helper. method = 'POST' | 'DELETE'. */
async function toggleFollow(apiRequest, actor, targetId, method = "POST") {
  return apiRequest.fetch(`${BASE_API}/users/${targetId}/follow`, {
    method,
    headers: { Authorization: `Bearer ${actor.token}` },
  });
}

/** Create an article; returns { id, title }. */
async function createArticle(apiRequest, author, overrides = {}) {
  const title = overrides.title || `E2E Article ${ts()}_${rand()}`;
  const payload = {
    title,
    content: overrides.content || "Body for identity-follow smoke spec.",
    ...overrides,
  };
  const resp = await apiRequest.post(`${BASE_API}/articles`, {
    headers: { Authorization: `Bearer ${author.token}` },
    data: payload,
  });
  expect(resp.ok(), await resp.text()).toBeTruthy();
  const body = await resp.json();
  // resource create handler returns the inserted record (with id)
  const id = body?.id || body?.data?.id || body?.insertId;
  return { id, title };
}

/** Create a community post. section/is_anonymous/title/content configurable. */
async function createCommunityPost(apiRequest, author, overrides = {}) {
  const payload = {
    section: overrides.section || "help",
    title: overrides.title || `E2E Post ${ts()}_${rand()}`,
    content: overrides.content || "Help question body.",
    is_anonymous: overrides.is_anonymous ?? 0,
    ...overrides,
  };
  const resp = await apiRequest.post(`${BASE_API}/community/posts`, {
    headers: { Authorization: `Bearer ${author.token}` },
    data: payload,
  });
  expect(resp.ok(), await resp.text()).toBeTruthy();
  const body = await resp.json();
  return {
    id: body?.id || body?.data?.id || body?.post?.id,
    title: payload.title,
  };
}

/** Create a photo (for scroll memory test). */
async function createPhoto(apiRequest, author, overrides = {}) {
  const payload = {
    title: overrides.title || `E2E Photo ${ts()}_${rand()}`,
    url: overrides.url || "/static/placeholder.jpg",
    ...overrides,
  };
  const resp = await apiRequest.post(`${BASE_API}/photos`, {
    headers: { Authorization: `Bearer ${author.token}` },
    data: payload,
  });
  expect(resp.ok(), await resp.text()).toBeTruthy();
  const body = await resp.json();
  return { id: body?.id || body?.data?.id, title: payload.title };
}

/** Fetch notifications for a user; returns { data, unreadCount }. */
async function fetchNotifications(apiRequest, user) {
  const resp = await apiRequest.get(`${BASE_API}/notifications`, {
    headers: { Authorization: `Bearer ${user.token}` },
  });
  expect(resp.ok(), await resp.text()).toBeTruthy();
  return resp.json();
}

/** Inject JWT + minimal user shell into localStorage so the SPA reads logged-in state. */
async function primeAuthStorage(page, user) {
  // goto a lightweight route first so localStorage has an origin to write to.
  await page.goto("/");
  await page.evaluate(
    ({ token, id, username }) => {
      // The app stores auth under a couple of common keys; set both to be safe.
      // If the app only reads one, the other is inert.
      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({ id, username, role: "user" }),
      );
      localStorage.setItem("auth_token", token);
      localStorage.setItem(
        "auth_user",
        JSON.stringify({ id, username, role: "user" }),
      );
    },
    { token: user.token, id: user.id, username: user.username },
  );
}

/** Fetch a user's fresh record from the public profile endpoint. */
async function fetchPublicProfile(apiRequest, userId) {
  const resp = await apiRequest.get(`${BASE_API}/users/${userId}/profile`);
  expect(resp.ok(), await resp.text()).toBeTruthy();
  return resp.json();
}

test.describe("identity & follow notifications smoke", () => {
  // ---------------------------------------------------------------------------
  // 11.1 — author_name: username fallback -> nickname after set
  // ---------------------------------------------------------------------------
  test("11.1 author_name shows username when nickname unset, then nickname after set", async ({
    page,
    request: apiRequest,
  }) => {
    const author = await registerUser(apiRequest, "s1_author");
    const article = await createArticle(apiRequest, author, {
      title: `S1_ArticleTitle_${ts()}`,
    });
    expect(article.id).toBeTruthy();

    // Anonymous visitor: author_name should fall back to username.
    await page.goto(`/articles?id=${article.id}`);
    // Match the article title to confirm detail has loaded before asserting author.
    await expect(
      page.getByText(article.title, { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(author.username, { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Set a nickname for author via API (faster + less brittle than UI form).
    const nickname = `夜航船_${rand()}`;
    const nickResp = await setNickname(apiRequest, author, nickname);
    expect(nickResp.ok(), await nickResp.text()).toBeTruthy();

    // Reload article detail; author_name should now surface the nickname.
    await page.goto(`/articles?id=${article.id}`);
    await expect(
      page.getByText(article.title, { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(nickname, { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Sanity-check via API as well: feed-style endpoints should now render
    // author_name = nickname.
    const profile = await fetchPublicProfile(apiRequest, author.id);
    expect(profile.nickname).toBe(nickname);
  });

  // ---------------------------------------------------------------------------
  // 11.2 — nickname collision returns 409 + toast
  // ---------------------------------------------------------------------------
  test("11.2 nickname collision returns 409 and shows toast", async ({
    page,
    request: apiRequest,
  }) => {
    const userA = await registerUser(apiRequest, "s2_a");
    const userB = await registerUser(apiRequest, "s2_b");

    const sharedNickname = `小明_${rand()}`;

    // A claims the nickname first.
    const aResp = await setNickname(apiRequest, userA, sharedNickname);
    expect(aResp.ok(), await aResp.text()).toBeTruthy();

    // B tries the same nickname via API — expect 409 + Chinese error message.
    const bResp = await setNickname(apiRequest, userB, sharedNickname);
    expect(bResp.status()).toBe(409);
    const bBody = await bResp.json();
    expect(JSON.stringify(bBody)).toMatch(/该昵称已被使用/);

    // Verify via public profile that B's nickname did not change.
    const bProfile = await fetchPublicProfile(apiRequest, userB.id);
    expect(bProfile.nickname || "").not.toBe(sharedNickname);

    // UI check: log B in and submit the same nickname via the settings form.
    // Expect an on-screen toast/alert with the Chinese text.
    await primeAuthStorage(page, userB);
    await page.goto(`/user/${userB.id}?tab=settings`);

    // The settings form exposes a nickname input; try a few locator shapes to
    // stay resilient to label vs placeholder wording ("昵称" is the expected
    // copy in the design).
    const nicknameInput = page
      .getByLabel(/昵称|Nickname/i)
      .or(page.getByPlaceholder(/昵称|Nickname/i))
      .first();
    await expect(nicknameInput).toBeVisible({ timeout: 15_000 });
    await nicknameInput.fill(sharedNickname);

    const saveBtn = page
      .getByRole("button", { name: /保存|Save|更新|Submit/i })
      .first();
    await saveBtn.click();

    // Expect a toast surfacing the collision.
    await expect(
      page.getByText(/该昵称已被使用/).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Re-verify B's nickname was not persisted.
    const bProfileAfter = await fetchPublicProfile(apiRequest, userB.id);
    expect(bProfileAfter.nickname || "").not.toBe(sharedNickname);
  });

  // ---------------------------------------------------------------------------
  // 11.3 — follow triggers new_content notification
  // ---------------------------------------------------------------------------
  test("11.3 follow triggers new_content notification after publish", async ({
    page,
    request: apiRequest,
  }) => {
    test.slow(); // fan-out window may exceed default timeout
    const publisher = await registerUser(apiRequest, "s3_pub");
    const fan = await registerUser(apiRequest, "s3_fan");

    // fan follows publisher.
    const followResp = await toggleFollow(apiRequest, fan, publisher.id);
    expect(followResp.ok(), await followResp.text()).toBeTruthy();

    // publisher drops an article with a deterministic title so we can grep
    // for it inside the notification payload.
    const uniqueTitle = `S3_PublishedArticle_${ts()}_${rand()}`;
    const article = await createArticle(apiRequest, publisher, {
      title: uniqueTitle,
    });
    expect(article.id).toBeTruthy();

    // Poll the notifications endpoint up to ~90s; assert a new_content style
    // notification appears that mentions both the publisher and the title.
    await expect
      .poll(
        async () => {
          const payload = await fetchNotifications(apiRequest, fan);
          const list = payload?.data || payload?.notifications || [];
          return list.find((n) => {
            const blob = JSON.stringify(n);
            return (
              /new_content|关注|发布/i.test(blob) &&
              blob.includes(uniqueTitle) &&
              blob.includes(publisher.username)
            );
          })
            ? "ok"
            : "pending";
        },
        {
          message:
            "expected a new_content notification mentioning publisher + title",
          timeout: 90_000,
          intervals: [1_000, 2_000, 5_000],
        },
      )
      .toBe("ok");

    // Sanity: unreadCount > 0 as well.
    const finalPayload = await fetchNotifications(apiRequest, fan);
    const unread = finalPayload?.unreadCount ?? finalPayload?.unread ?? 0;
    expect(unread).toBeGreaterThan(0);

    // Optional UI smoke: log fan in, visit home, notification bell badge
    // should render (best-effort; only asserts badge exists if present).
    await primeAuthStorage(page, fan);
    await page.goto("/");
    // Non-fatal: we don't force-assert the bell DOM here to keep the test
    // focused on the spec requirement (notification delivery). The API
    // assertion above is the authoritative acceptance check.
  });

  // ---------------------------------------------------------------------------
  // 11.4 — anonymous help post skips fan-out + hidden from author profile
  // ---------------------------------------------------------------------------
  test("11.4 anonymous help post skips fan-out and is hidden from author profile", async ({
    page,
    request: apiRequest,
  }) => {
    const author = await registerUser(apiRequest, "s4_author");
    const fan = await registerUser(apiRequest, "s4_fan");

    // fan follows author.
    const followResp = await toggleFollow(apiRequest, fan, author.id);
    expect(followResp.ok(), await followResp.text()).toBeTruthy();

    // Snapshot fan's notification count BEFORE the anonymous post.
    const before = await fetchNotifications(apiRequest, fan);
    const beforeCount = (before?.data || before?.notifications || []).length;

    // Author posts an anonymous help post.
    const anonTitle = `S4_AnonHelp_${ts()}_${rand()}`;
    const post = await createCommunityPost(apiRequest, author, {
      section: "help",
      is_anonymous: 1,
      title: anonTitle,
      content: "Anon question, should NOT trigger fan-out.",
    });
    expect(post.id).toBeTruthy();

    // Give the (hypothetical) fan-out worker a short window, then confirm no
    // notification referencing the anon title landed.
    await expect
      .poll(
        async () => {
          const payload = await fetchNotifications(apiRequest, fan);
          const list = payload?.data || payload?.notifications || [];
          const match = list.find((n) =>
            JSON.stringify(n).includes(anonTitle),
          );
          return {
            grew: list.length - beforeCount,
            mentionsAnon: Boolean(match),
          };
        },
        {
          message:
            "anonymous help post must not appear in fan's notifications",
          timeout: 30_000,
          intervals: [1_000, 2_000, 3_000],
        },
      )
      .toEqual(expect.objectContaining({ mentionsAnon: false }));

    // Author's public profile "求助" tab should not surface the anon post.
    // Using anonymous viewer so isOwner=false branch applies.
    await page.goto(`/user/${author.id}`);
    // Click the 求助 tab if it exists (this tab is introduced by this change;
    // if unavailable the getByRole call will time out and surface a clear
    // failure, which is the intended acceptance-gate behavior).
    const helpTab = page.getByRole("tab", { name: /求助|Help/ }).first();
    await expect(helpTab).toBeVisible({ timeout: 15_000 });
    await helpTab.click();
    await expect(page.getByText(anonTitle)).toHaveCount(0);
  });

  // ---------------------------------------------------------------------------
  // 11.5 — self-follow rejected with 400
  // ---------------------------------------------------------------------------
  test("11.5 self-follow rejected with 400 (POST and DELETE)", async ({
    request: apiRequest,
  }) => {
    const user = await registerUser(apiRequest, "s5_self");

    const postResp = await toggleFollow(apiRequest, user, user.id, "POST");
    expect(postResp.status()).toBe(400);
    const postBody = await postResp.json();
    // Current backend returns English; spec calls for 中文. Accept either so
    // this test does not fail purely on wording during the rename transition.
    expect(JSON.stringify(postBody)).toMatch(
      /不能关注自己|Cannot follow yourself/i,
    );

    const delResp = await toggleFollow(apiRequest, user, user.id, "DELETE");
    expect(delResp.status()).toBe(400);
    const delBody = await delResp.json();
    expect(JSON.stringify(delBody)).toMatch(
      /不能关注自己|Cannot follow yourself/i,
    );
  });

  // ---------------------------------------------------------------------------
  // 11.6 — detail avatar click navigates to /user/:id and back restores
  // ---------------------------------------------------------------------------
  test("11.6 detail page avatar click navigates to /user/:id and back restores", async ({
    page,
    request: apiRequest,
  }) => {
    const author = await registerUser(apiRequest, "s6_author");
    const viewer = await registerUser(apiRequest, "s6_viewer");

    const article = await createArticle(apiRequest, author, {
      title: `S6_ArticleTitle_${ts()}`,
    });
    expect(article.id).toBeTruthy();

    await primeAuthStorage(page, viewer);
    await page.goto(`/articles?id=${article.id}`);

    // Confirm detail loaded.
    await expect(
      page.getByText(article.title, { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Click the author affordance. The new interaction exposes the author
    // block as role="button" with an accessible name referencing the author.
    // Try role=button with accessible name first; fall back to the text link.
    const authorButton = page
      .getByRole("button", {
        name: new RegExp(`${author.username}|作者|author`, "i"),
      })
      .or(page.getByRole("link", { name: new RegExp(author.username, "i") }))
      .first();
    await expect(authorButton).toBeVisible({ timeout: 15_000 });
    await authorButton.click();

    // URL should now end with /user/<author.id>.
    await expect(page).toHaveURL(new RegExp(`/user/${author.id}(?:[/?#]|$)`), {
      timeout: 15_000,
    });

    // Go back and confirm the article detail is visible again.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/articles\\?.*id=${article.id}`), {
      timeout: 15_000,
    });
    await expect(
      page.getByText(article.title, { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // 11.7 — profile tab + scroll memory across detail navigation
  // ---------------------------------------------------------------------------
  test("11.7 profile tab + scroll memory", async ({
    page,
    request: apiRequest,
  }) => {
    test.slow(); // seeding 10 photos + 3 articles over HTTP takes time
    const author = await registerUser(apiRequest, "s7_author");
    const viewer = await registerUser(apiRequest, "s7_viewer");

    // Seed plenty of photos + a few articles so the page is tall enough to
    // scroll meaningfully.
    const photoIds = [];
    for (let i = 0; i < 10; i++) {
      const photo = await createPhoto(apiRequest, author, {
        title: `S7_Photo_${i}_${rand()}`,
      });
      if (photo.id) photoIds.push(photo.id);
    }
    for (let i = 0; i < 3; i++) {
      await createArticle(apiRequest, author, {
        title: `S7_Article_${i}_${rand()}`,
      });
    }
    expect(photoIds.length).toBeGreaterThan(0);

    await primeAuthStorage(page, viewer);
    await page.goto(`/user/${author.id}`);

    // Switch to the 图片 tab (introduced by this change).
    const photoTab = page.getByRole("tab", { name: /图片|Photos?/ }).first();
    await expect(photoTab).toBeVisible({ timeout: 15_000 });
    await photoTab.click();

    // Wait for at least one photo card to render.
    await expect(
      page.getByRole("link", { name: /Photo|图/i }).first().or(
        page.locator("[data-testid='photo-card']").first(),
      ),
    ).toBeVisible({ timeout: 15_000 });

    // Scroll to roughly the middle of the page to have a non-zero scrollY to
    // remember.
    const scrollTargetY = await page.evaluate(() => {
      const y = Math.floor(document.documentElement.scrollHeight * 0.5);
      window.scrollTo({ top: y, behavior: "instant" });
      return y;
    });
    const scrollYBefore = await page.evaluate(() => window.scrollY);
    expect(scrollYBefore).toBeGreaterThan(100);

    // Click the first available photo card. We match by common affordances;
    // the component renders cards as role="link" to /gallery?id=... or as a
    // testid photo-card.
    const firstPhotoCard = page
      .getByRole("link", { name: /S7_Photo/ })
      .first()
      .or(page.locator("[data-testid='photo-card']").first());
    await expect(firstPhotoCard).toBeVisible({ timeout: 15_000 });
    await firstPhotoCard.click();

    // URL should be a gallery detail (?id=...) or a photo detail route.
    await expect(page).toHaveURL(/\/gallery\?.*id=\d+|\/photos?\/\d+/, {
      timeout: 15_000,
    });

    // Back to profile; tab should still be 图片 and scrollY restored within
    // ±50px tolerance.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/user/${author.id}`), {
      timeout: 15_000,
    });
    await expect(photoTab).toHaveAttribute("aria-selected", "true", {
      timeout: 10_000,
    });

    await expect
      .poll(() => page.evaluate(() => window.scrollY), {
        message: "scroll position should be restored after back navigation",
        timeout: 10_000,
        intervals: [250, 500, 1000],
      })
      .toBeGreaterThan(scrollYBefore - 50);
    const scrollYAfter = await page.evaluate(() => window.scrollY);
    expect(scrollYAfter).toBeLessThan(scrollYBefore + 50);
    expect(scrollTargetY).toBeGreaterThan(0);
  });
});
