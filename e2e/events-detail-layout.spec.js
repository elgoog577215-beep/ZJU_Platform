import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 1100 };

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getModalHeroRect = async (page, title) =>
  page.evaluate((eventTitle) => {
    const images = [...document.querySelectorAll("img")].filter(
      (img) => img.alt === eventTitle,
    );
    const target = images.at(-1);
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  }, title);

const isCloseButtonTopmost = async (page) =>
  page.evaluate(() => {
    const closeButtons = [
      ...document.querySelectorAll('button[aria-label="关闭"]'),
    ];
    const button = closeButtons.at(-1);
    if (!button) return false;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(x, y);
    return button === topElement || button.contains(topElement);
  });

const getFirstEvent = async (request) => {
  const response = await request.get(
    "/api/events?page=1&limit=1&sort=date_desc&status=approved",
  );
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.data?.length).toBeGreaterThan(0);
  return payload.data[0];
};

const openEventDetail = async (page, eventId) => {
  await page.goto(`/events?id=${eventId}`);
  await expect(page.getByRole("button", { name: "关闭" })).toBeVisible();
};

test.describe("event detail layout regression", () => {
  test("mobile detail keeps header content inside the sheet and locks body scroll", async ({
    page,
    request,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const event = await getFirstEvent(request);

    await openEventDetail(page, event.id);

    const closeButton = page.getByRole("button", { name: "关闭" });
    const title = page.getByRole("heading", {
      level: 2,
      name: new RegExp(escapeRegExp(event.title)),
    });

    await expect(title).toBeVisible();
    await expect(closeButton).toBeVisible();

    const bodyOverflow = await page.evaluate(
      () => document.body.style.overflow,
    );
    expect(bodyOverflow).toBe("hidden");

    const heroRect = await getModalHeroRect(page, event.title);
    const closeRect = await closeButton.boundingBox();
    const titleRect = await title.boundingBox();

    expect(heroRect).not.toBeNull();
    expect(closeRect).not.toBeNull();
    expect(titleRect).not.toBeNull();

    expect(heroRect.y).toBeGreaterThan(20);
    expect(titleRect.y).toBeGreaterThanOrEqual(heroRect.bottom + 8);
    expect(closeRect.y + closeRect.height).toBeLessThanOrEqual(heroRect.bottom);
    expect(await isCloseButtonTopmost(page)).toBeTruthy();

    await closeButton.click();
    await expect(closeButton).toHaveCount(0);
    await expect(title).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");
  });

  test("desktop detail keeps the close button topmost above the hero overlay", async ({
    page,
    request,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const event = await getFirstEvent(request);

    await openEventDetail(page, event.id);

    const closeButton = page.getByRole("button", { name: "关闭" });
    const title = page.getByRole("heading", {
      level: 2,
      name: new RegExp(escapeRegExp(event.title)),
    });

    await expect(closeButton).toBeVisible();
    await expect(title).toBeVisible();
    expect(await isCloseButtonTopmost(page)).toBeTruthy();

    await closeButton.click();
    await expect(closeButton).toHaveCount(0);
  });
});
