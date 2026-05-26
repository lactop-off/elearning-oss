import { expect, test } from '@playwright/test';

async function signInAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

test('header shows "My courses" link for instructor', async ({ page }) => {
  await signInAs(page, 'instructor@example.com');

  const navLink = page.getByRole('navigation').getByRole('link', { name: 'My courses' });
  await expect(navLink).toBeVisible();
  await navLink.click();
  await page.waitForURL('/en/instructor/courses');
  await expect(page.getByRole('heading', { name: 'Your courses' })).toBeVisible();
});

test('header does not show "My courses" link for learner', async ({ page }) => {
  await signInAs(page, 'learner@example.com');

  await expect(page.getByRole('link', { name: 'My courses' })).toHaveCount(0);
});

test('instructor can publish then unpublish a course', async ({ page }) => {
  await signInAs(page, 'instructor@example.com');

  // Create a fresh course so this test is independent of others.
  await page.goto('/en/instructor/courses/new');
  const unique = `pub-${Date.now()}`;
  await page.getByRole('textbox', { name: 'Course title' }).fill(`Course ${unique}`);
  await page.getByRole('textbox', { name: 'Slug' }).fill(unique);
  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();
  await page.waitForURL('/en');

  await page.goto('/en/instructor/courses');
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: `Course ${unique}` }) });
  await expect(card.getByText('Draft')).toBeVisible();

  await card.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Course published')).toBeVisible();
  await expect(card.getByText('Published')).toBeVisible();

  await card.getByRole('button', { name: 'Move to draft' }).click();
  await expect(page.getByText('Course moved to draft')).toBeVisible();
  await expect(card.getByText('Draft')).toBeVisible();
});
