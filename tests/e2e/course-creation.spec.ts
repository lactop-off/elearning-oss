import { expect, test } from '@playwright/test';

async function signInAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

test('instructor can create a course', async ({ page }) => {
  await signInAs(page, 'instructor@example.com');

  await page.goto('/en/instructor/courses/new');
  await expect(page.getByText('Create a new course')).toBeVisible();

  const unique = `auto-${Date.now()}`;
  await page.getByRole('textbox', { name: 'Course title' }).fill(`Course ${unique}`);
  await page.getByRole('textbox', { name: 'Slug' }).fill(unique);
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill('Created by the e2e suite.');

  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();

  await page.waitForURL('/en');
  await expect(page.getByText('Course created')).toBeVisible();
});

test('learner is sent home from the create page (forbidden)', async ({ page }) => {
  await signInAs(page, 'learner@example.com');

  await page.goto('/en/instructor/courses/new');
  await expect(page).toHaveURL(/\/en$/);
});

test('unauthenticated visitor is sent through sign-in for the create page', async ({ page }) => {
  await page.goto('/en/instructor/courses/new');
  await expect(page).toHaveURL(/\/(en\/)?sign-in/);
});
