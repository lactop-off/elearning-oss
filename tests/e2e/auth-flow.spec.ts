import { expect, test } from '@playwright/test';

test('demo learner can sign in and out (ja)', async ({ page }) => {
  await page.goto('/ja/sign-in');
  await page.getByRole('textbox', { name: 'メールアドレス' }).fill('learner@example.com');
  await page.getByLabel('パスワード').fill('demo1234');
  await page.getByRole('button', { name: 'サインイン' }).click();

  await page.waitForURL('/ja');
  await expect(page.getByText('Demo Learner')).toBeVisible();
  await expect(page.getByText('(学習者)')).toBeVisible();

  await page.getByRole('button', { name: 'サインアウト' }).click();
  await expect(page.getByRole('link', { name: 'サインイン' })).toBeVisible();
});

test('sign-in rejects an unknown email (en)', async ({ page }) => {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill('nobody@example.com');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText(/email or password is incorrect/i)).toBeVisible();
  await expect(page).toHaveURL(/\/en\/sign-in/);
});
