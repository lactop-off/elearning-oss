import { expect, test } from '@playwright/test';

const DEMO_COURSE_SLUG = 'intro-to-typescript';
const DEMO_COURSE_TITLE = 'Intro to TypeScript';

async function signInAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

test('anonymous visitor can browse the public catalog', async ({ page }) => {
  await page.goto('/en/courses');
  await expect(page.getByRole('heading', { name: 'Course catalog' })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: DEMO_COURSE_TITLE }),
  ).toBeVisible();
});

test('anonymous visitor sees Sign in CTA on a course detail page', async ({ page }) => {
  await page.goto(`/en/courses/${DEMO_COURSE_SLUG}`);
  await expect(page.getByRole('heading', { name: DEMO_COURSE_TITLE })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Sign in to enroll' }),
  ).toBeVisible();
});

test('new learner can enroll and see the course in My learning', async ({ page }) => {
  // Use a fresh signup so this test isn't dependent on existing enrollment state.
  const email = `enroller-${Date.now()}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Enroller Tester');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/courses/${DEMO_COURSE_SLUG}`);
  await page.getByRole('main').getByRole('button', { name: 'Enroll' }).click();

  await page.waitForURL('/en/learn');
  await expect(page.getByText('Enrolled in course')).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: DEMO_COURSE_TITLE }),
  ).toBeVisible();
});

test('already-enrolled learner sees the enrolled CTA, not the Enroll button', async ({ page }) => {
  const email = `enrolled-${Date.now()}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Enrolled Tester');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/courses/${DEMO_COURSE_SLUG}`);
  await page.getByRole('main').getByRole('button', { name: 'Enroll' }).click();
  await page.waitForURL('/en/learn');

  await page.goto(`/en/courses/${DEMO_COURSE_SLUG}`);
  await expect(
    page.getByRole('main').getByRole('link', { name: /You are enrolled/ }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: 'Enroll' })).toHaveCount(0);
});

test('header shows Catalog and My learning links appropriately', async ({ page }) => {
  await page.goto('/en');
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Catalog' }),
  ).toBeVisible();

  await signInAs(page, 'learner@example.com');
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'My learning' }),
  ).toBeVisible();
});
