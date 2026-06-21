import { test, expect } from '@playwright/test';

test('home page loads with primary navigation', async ({ page }) => {
  const startupErrors = [];
  page.on('console', (message) => {
    if (/Failed to fetch dynamically imported module|HomeSplash-.*\.js/i.test(message.text())) {
      startupErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (/Failed to fetch dynamically imported module|HomeSplash-.*\.js/i.test(error.message)) {
      startupErrors.push(error.message);
    }
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/拓途浙享/);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('link', { name: /拓途浙享首页/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '活动聚合' })).toBeVisible();
  expect(startupErrors).toEqual([]);
});
