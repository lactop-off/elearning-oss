import { expect, test } from '@playwright/test';

test('root path redirects to a supported locale', async ({ page }) => {
  // next-intl's locale detection picks based on Accept-Language. Playwright
  // defaults to English so we get /en in CI; native Japanese browsers will
  // land on /ja.
  await page.goto('/');
  await expect(page).toHaveURL(/\/(ja|en)$/);
});

test('home page renders the platform title and unauthenticated CTAs (ja)', async ({ page }) => {
  await page.goto('/ja');
  await expect(page).toHaveTitle(/E-learning OSS/);
  await expect(page.getByRole('heading', { name: 'E-learning OSS' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'サインイン' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'アカウントを作成' })).toBeVisible();
});

test('home page in en shows english CTAs', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
});

test('sign-in page renders the form (ja)', async ({ page }) => {
  await page.goto('/ja/sign-in');
  await expect(page.getByText('おかえりなさい')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'メールアドレス' })).toBeVisible();
  await expect(page.getByLabel('パスワード')).toBeVisible();
  await expect(page.getByRole('button', { name: 'サインイン' })).toBeVisible();
});

test('sign-up page renders the form (en)', async ({ page }) => {
  await page.goto('/en/sign-up');
  await expect(page.getByText('Start learning in less than a minute')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
});
