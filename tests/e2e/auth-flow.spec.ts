import { expect, test } from '@playwright/test';

test('demo learner can sign in and out', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill('learner@example.com');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/');
  await expect(page.getByText('Demo Learner')).toBeVisible();
  await expect(page.getByText('(learner)')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('sign-in rejects an unknown email', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill('nobody@example.com');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText(/email or password is incorrect/i)).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});
