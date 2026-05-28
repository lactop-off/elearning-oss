import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

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

async function addLesson(
  page: import('@playwright/test').Page,
  slug: string,
  title: string,
) {
  await page.goto(`/en/instructor/courses/${slug}/lessons/new`);
  await page.getByRole('textbox', { name: 'Lesson title' }).fill(title);
  await page.getByRole('textbox', { name: 'Content' }).fill(`${title} body.`);
  await page.getByRole('main').getByRole('button', { name: 'Save lesson' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}`);
}

test('instructor can edit and delete a lesson', async ({ page }) => {
  await signInAs(page, 'instructor@example.com');

  const slug = `lesson-ed-${Date.now()}`;
  await createCourse(page, slug);
  await addLesson(page, slug, 'Original lesson');

  await page.goto(`/en/instructor/courses/${slug}`);
  await expect(page.getByRole('heading', { name: /Original lesson/ })).toBeVisible();

  // Open the edit page via the per-lesson Edit link. The dev server compiles
  // this route on first hit, so allow extra time for the navigation.
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}/lessons/1/edit`, {
    timeout: 60_000,
  });

  // The form should be prefilled with the existing lesson title.
  const titleInput = page.getByRole('textbox', { name: 'Lesson title' });
  await expect(titleInput).toHaveValue('Original lesson');

  await titleInput.fill('Updated lesson');
  await page
    .getByRole('textbox', { name: 'Content' })
    .fill('Updated body text.');
  await page.getByRole('main').getByRole('button', { name: 'Save changes' }).click();

  await page.waitForURL(`/en/instructor/courses/${slug}`);
  await expect(page.getByText('Lesson updated')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Updated lesson/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Original lesson/ })).toHaveCount(0);

  // Delete from the list, confirming through the dialog.
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Delete this lesson?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete lesson' }).click();

  await expect(page.getByText('Lesson deleted')).toBeVisible();
  await expect(page.getByText('No lessons yet')).toBeVisible();
});

test('non-owner instructor cannot reach the edit page for a foreign lesson', async ({
  browser,
}) => {
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signInAs(ownerPage, 'instructor@example.com');
  const slug = `lesson-ed-foreign-${Date.now()}`;
  await createCourse(ownerPage, slug);
  await addLesson(ownerPage, slug, 'Owner lesson');
  await ownerContext.close();

  // A learner (not the owner, not an instructor of this course) hits the edit
  // URL directly — must be bounced before seeing the form.
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signInAs(otherPage, 'learner@example.com');
  await otherPage.goto(`/en/instructor/courses/${slug}/lessons/1/edit`);
  // Learner gets redirected to home by requireRole.
  await expect(otherPage).toHaveURL(/\/en$/);
  await otherContext.close();
});
