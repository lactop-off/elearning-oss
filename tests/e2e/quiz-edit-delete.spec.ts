import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function signInAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

async function createCourseWithLessonAndQuiz(
  page: import('@playwright/test').Page,
  slug: string,
): Promise<string> {
  await page.goto('/en/instructor/courses/new');
  await page.getByRole('textbox', { name: 'Course title' }).fill(`Course ${slug}`);
  await page.getByRole('textbox', { name: 'Slug' }).fill(slug);
  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/instructor/courses/${slug}/lessons/new`);
  await page.getByRole('textbox', { name: 'Lesson title' }).fill('Lesson One');
  await page.getByRole('textbox', { name: 'Content' }).fill('Lesson body.');
  await page.getByRole('main').getByRole('button', { name: 'Save lesson' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}`);

  await page.goto(`/en/instructor/courses/${slug}/lessons/1/quizzes/new`);
  await page.getByRole('textbox', { name: 'Quiz title' }).fill('Original quiz');
  await page.getByRole('main').getByRole('button', { name: 'Create quiz' }).click();
  await page.waitForURL(/\/instructor\/courses\/[^/]+\/quizzes\/[^/]+$/, { timeout: 60_000 });

  // The URL holds the quizId — extract it for downstream navigation.
  const url = page.url();
  const quizId = url.split('/').pop()!;
  return quizId;
}

test('instructor can edit and delete a quiz', async ({ page }) => {
  // The /edit route is compiled lazily by the dev server on first hit,
  // and this test exercises two newly-added routes in sequence.
  test.slow();
  await signInAs(page, 'instructor@example.com');

  const slug = `quiz-ed-${Date.now()}`;
  const quizId = await createCourseWithLessonAndQuiz(page, slug);

  // From the quiz authoring page, the Edit link should land on /edit.
  await page.getByRole('main').getByRole('link', { name: 'Edit' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}/quizzes/${quizId}/edit`, {
    timeout: 60_000,
  });

  // Form is prefilled.
  const titleInput = page.getByRole('textbox', { name: 'Quiz title' });
  await expect(titleInput).toHaveValue('Original quiz');

  await titleInput.fill('Updated quiz');
  await page.getByRole('main').getByRole('button', { name: 'Save changes' }).click();

  await page.waitForURL(`/en/instructor/courses/${slug}/quizzes/${quizId}`, {
    timeout: 60_000,
  });
  await expect(page.getByText('Quiz updated')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Updated quiz' })).toBeVisible();

  // Delete from the same page; confirm in the dialog.
  await page.getByRole('main').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Delete this quiz?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete quiz' }).click();

  await expect(page.getByText('Quiz deleted')).toBeVisible();
  // Land back on the course detail page; the quiz should no longer appear.
  await page.waitForURL(`/en/instructor/courses/${slug}`, { timeout: 60_000 });
  await expect(page.getByText('Updated quiz')).toHaveCount(0);
});

test('non-owner cannot reach the quiz edit URL', async ({ browser }) => {
  test.slow();
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signInAs(ownerPage, 'instructor@example.com');
  const slug = `quiz-ed-foreign-${Date.now()}`;
  const quizId = await createCourseWithLessonAndQuiz(ownerPage, slug);
  await ownerContext.close();

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signInAs(otherPage, 'learner@example.com');
  await otherPage.goto(`/en/instructor/courses/${slug}/quizzes/${quizId}/edit`);
  await expect(otherPage).toHaveURL(/\/en$/);
  await otherContext.close();
});
