import { expect, test } from '@playwright/test';

test('home page loads and renders Next.js scaffold content', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Next\.js|Create Next App|App/i);
});
