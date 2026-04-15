import { test, expect } from '@playwright/test';

test('home page loads with primary navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/拓途浙享/);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '首页' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '活动' })).toBeVisible();
});
