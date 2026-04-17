import { test, expect } from '@playwright/test';

async function login(page, request) {
  const r = await request.post('http://localhost:5181/api/auth/login', {
    data: { username: 'seed_admin', password: 'Admin123456' },
  });
  const { token } = await r.json();
  expect(token).toBeTruthy();
  await page.goto('http://localhost:5180/');
  await page.evaluate(t => localStorage.setItem('token', t), token);
}

async function openFavorites(page) {
  await page.goto('http://localhost:5180/user/1');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button').filter({ hasText: '收藏' }).first().click();
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(600);
}

test('photo favorite: click → detail → X → /user/1', async ({ page, request }) => {
  test.setTimeout(60000);
  await login(page, request);
  await openFavorites(page);

  const photoCard = page.locator('div.group').filter({ has: page.locator('p', { hasText: /^照片$/ }) }).first();
  await expect(photoCard).toBeVisible({ timeout: 5000 });
  await photoCard.click();
  await page.waitForTimeout(2000);

  const lightbox = page.locator('div.fixed.inset-0').first();
  expect(await lightbox.isVisible()).toBe(true);
  expect(page.url()).toContain('/gallery?id=');

  const closeBtn = page.locator('div.fixed.inset-0 button:has(svg.lucide-x)').first();
  await closeBtn.click();
  await page.waitForTimeout(1500);

  expect(page.url()).toContain('/user/1');
  expect(page.url()).not.toContain('/gallery');
});

test('video favorite: click → detail → X → /user/1', async ({ page, request }) => {
  test.setTimeout(60000);
  await login(page, request);
  await openFavorites(page);

  const videoCard = page.locator('div.group').filter({ has: page.locator('p', { hasText: /^视频$/ }) }).first();
  await expect(videoCard).toBeVisible({ timeout: 5000 });
  await videoCard.click();
  await page.waitForTimeout(2500);
  expect(page.url()).toContain('/videos');

  const closeBtn = page.locator('button:has(svg.lucide-x)').first();
  await expect(closeBtn).toBeVisible({ timeout: 5000 });
  await closeBtn.click();
  await page.waitForTimeout(1500);

  expect(page.url()).toContain('/user/1');
});

test('event favorite: click → detail → X → /user/1', async ({ page, request }) => {
  test.setTimeout(60000);
  await login(page, request);
  await openFavorites(page);

  // Event favorites show type "志愿服务" or similar — just pick the first with 活动-related subtitle.
  // Safer: use title "春季校园市集志愿招募" which was seen in prior body dump.
  const eventCard = page.locator('div.group').filter({ hasText: '春季校园市集志愿招募' }).first();
  await expect(eventCard).toBeVisible({ timeout: 5000 });
  await eventCard.click();
  await page.waitForTimeout(2500);
  expect(page.url()).toContain('/events');

  const closeBtn = page.locator('button:has(svg.lucide-x)').first();
  await expect(closeBtn).toBeVisible({ timeout: 5000 });
  await closeBtn.click();
  await page.waitForTimeout(1500);

  expect(page.url()).toContain('/user/1');
});

test('article favorite: click → detail → X → /user/1', async ({ page, request }) => {
  test.setTimeout(60000);
  await login(page, request);
  await openFavorites(page);

  // Article favorites show type "tech" (AICommunity tech tab)
  const articleCard = page.locator('div.group').filter({ has: page.locator('p', { hasText: /^tech$/ }) }).first();
  await expect(articleCard).toBeVisible({ timeout: 5000 });
  const title = await articleCard.locator('h4').textContent();
  console.log('article:', title);

  await articleCard.click();
  await page.waitForTimeout(2500);
  console.log('URL after click:', page.url());
  expect(page.url()).toContain('/articles');

  // Find X/close button in article detail. CommunityTech detail renders a close button.
  // Give it a broad search.
  const closeBtn = page.locator('button:has(svg.lucide-x)').first();
  await expect(closeBtn).toBeVisible({ timeout: 5000 });
  await closeBtn.click();
  await page.waitForTimeout(2000);

  console.log('URL after X:', page.url());
  expect(page.url()).toContain('/user/1');
});
