import { expect, test } from '@playwright/test';

test('home page renders the platform title and unauthenticated CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/E-learning OSS/);
  await expect(page.getByRole('heading', { name: 'E-learning OSS' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
});

test('sign-in page renders the form', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByText('Welcome back. Enter your credentials')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('sign-up page renders the form', async ({ page }) => {
  await page.goto('/sign-up');
  await expect(page.getByText('Start learning in less than a minute')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
});
