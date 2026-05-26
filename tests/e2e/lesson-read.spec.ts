import { expect, test } from '@playwright/test';

const DEMO_COURSE_SLUG = 'intro-to-typescript';
const DEMO_COURSE_TITLE = 'Intro to TypeScript';

async function freshLearner(page: import('@playwright/test').Page) {
  const email = `reader-${Date.now()}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Reader Tester');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');
  return email;
}

async function enrollDemoCourse(page: import('@playwright/test').Page) {
  await page.goto(`/en/courses/${DEMO_COURSE_SLUG}`);
  await page.getByRole('main').getByRole('button', { name: 'Enroll' }).click();
  await page.waitForURL('/en/learn');
}

test('enrolled learner sees lessons and progress, can mark a lesson complete', async ({ page }) => {
  await freshLearner(page);
  await enrollDemoCourse(page);

  await page.goto(`/en/learn/${DEMO_COURSE_SLUG}`);
  await expect(page.getByRole('heading', { name: DEMO_COURSE_TITLE })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your progress' })).toBeVisible();
  await expect(page.getByText('0 of 3 lessons completed')).toBeVisible();
  await expect(page.getByText('0% of required lessons done')).toBeVisible();

  // Open the first lesson via the title link.
  await page.getByRole('link', { name: /1\.\s*Why TypeScript\?/ }).click();
  await page.waitForURL(`/en/learn/${DEMO_COURSE_SLUG}/lessons/1`);
  await expect(page.getByRole('heading', { name: 'Why TypeScript?' })).toBeVisible();

  // Mark complete.
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Mark complete' })
    .click();
  await expect(page.getByText('Lesson marked complete')).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('button', { name: 'Already complete' }),
  ).toBeVisible();

  // Back to the course overview — progress should reflect 1 of 3 (~33%).
  await page.goto(`/en/learn/${DEMO_COURSE_SLUG}`);
  await expect(page.getByText('1 of 3 lessons completed')).toBeVisible();
  await expect(page.getByText('33% of required lessons done')).toBeVisible();
});

test('non-enrolled learner is sent to 404 on the lesson page', async ({ page }) => {
  await freshLearner(page);
  // Without enrolling in any course, try to read a lesson.
  const response = await page.goto(`/en/learn/${DEMO_COURSE_SLUG}/lessons/1`);
  expect(response?.status()).toBe(404);
});

test('anonymous visitor is redirected to sign-in from a lesson URL', async ({ page }) => {
  await page.goto(`/en/learn/${DEMO_COURSE_SLUG}/lessons/1`);
  await expect(page).toHaveURL(/\/sign-in/);
});
