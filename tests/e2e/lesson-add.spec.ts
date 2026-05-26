import { expect, test } from '@playwright/test';

async function signInAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

async function createCourse(page: import('@playwright/test').Page, slug: string) {
  await page.goto('/en/instructor/courses/new');
  await page.getByRole('textbox', { name: 'Course title' }).fill(`Course ${slug}`);
  await page.getByRole('textbox', { name: 'Slug' }).fill(slug);
  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();
  await page.waitForURL('/en');
}

test('instructor can open course detail and add a lesson', async ({ page }) => {
  await signInAs(page, 'instructor@example.com');

  const slug = `lesson-${Date.now()}`;
  await createCourse(page, slug);

  await page.goto(`/en/instructor/courses/${slug}`);
  await expect(page.getByRole('heading', { name: `Course ${slug}` })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lessons' })).toBeVisible();
  await expect(page.getByText('No lessons yet')).toBeVisible();

  await page
    .getByRole('main')
    .getByRole('link', { name: 'Add lesson' })
    .click();
  await page.waitForURL(`/en/instructor/courses/${slug}/lessons/new`);

  await page
    .getByRole('textbox', { name: 'Lesson title' })
    .fill('Introduction');
  await page
    .getByRole('textbox', { name: 'Content' })
    .fill('Welcome to the course.');
  await page.getByRole('main').getByRole('button', { name: 'Save lesson' }).click();

  await page.waitForURL(`/en/instructor/courses/${slug}`);
  await expect(page.getByText('Lesson added')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Introduction/ })).toBeVisible();
});

test('learner is sent home from a course detail page', async ({ page }) => {
  await signInAs(page, 'learner@example.com');
  await page.goto('/en/instructor/courses/whatever-slug');
  await expect(page).toHaveURL(/\/en$/);
});
