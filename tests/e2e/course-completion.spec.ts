import { expect, test } from '@playwright/test';

const DEMO_COURSE_SLUG = 'intro-to-typescript';

async function freshLearnerEnrolled(page: import('@playwright/test').Page) {
  const email = `completer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Completer Tester');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/courses/${DEMO_COURSE_SLUG}`);
  await page.getByRole('main').getByRole('button', { name: 'Enroll' }).click();
  await page.waitForURL('/en/learn');
}

test('completing every required lesson surfaces the completion banner + certificate', async ({
  page,
}) => {
  await freshLearnerEnrolled(page);

  // No completion yet.
  await page.goto(`/en/learn/${DEMO_COURSE_SLUG}`);
  await expect(page.getByText('Course complete!')).toHaveCount(0);

  // Mark all 3 required lessons complete.
  for (const order of [1, 2, 3]) {
    await page.goto(`/en/learn/${DEMO_COURSE_SLUG}/lessons/${order}`);
    await page
      .getByRole('main')
      .getByRole('button', { name: 'Mark complete' })
      .click();
    await expect(page.getByText('Lesson marked complete')).toBeVisible();
  }

  // Banner should now be visible on the course page with progress at 100%.
  await page.goto(`/en/learn/${DEMO_COURSE_SLUG}`);
  await expect(page.getByText('Course complete!')).toBeVisible();
  await expect(page.getByText(/3 of 3 lessons completed/)).toBeVisible();
  await expect(page.getByText(/100% of required lessons done/)).toBeVisible();
  await expect(page.getByText(/CERT-/)).toBeVisible();
});
