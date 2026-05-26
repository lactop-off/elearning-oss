import { expect, test } from '@playwright/test';

async function signInAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

async function createCourseWithLesson(page: import('@playwright/test').Page, slug: string) {
  // Fresh course owned by the signed-in instructor.
  await page.goto('/en/instructor/courses/new');
  await page.getByRole('textbox', { name: 'Course title' }).fill(`Course ${slug}`);
  await page.getByRole('textbox', { name: 'Slug' }).fill(slug);
  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();
  await page.waitForURL('/en');

  // Add a lesson so quizzes have something to attach to.
  await page.goto(`/en/instructor/courses/${slug}/lessons/new`);
  await page.getByRole('textbox', { name: 'Lesson title' }).fill('Lesson One');
  await page.getByRole('textbox', { name: 'Content' }).fill('Lesson body.');
  await page.getByRole('main').getByRole('button', { name: 'Save lesson' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}`);
}

test('instructor can create a quiz on a lesson and add a question with choices', async ({
  page,
}) => {
  await signInAs(page, 'instructor@example.com');

  const slug = `quiz-${Date.now()}`;
  await createCourseWithLesson(page, slug);

  // Open the new-quiz form for the freshly created lesson via the overview.
  await page.goto(`/en/instructor/courses/${slug}`);
  await expect(page.getByRole('heading', { name: 'Quizzes' })).toBeVisible();
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Add quiz' })
    .click();
  await page.waitForURL(`/en/instructor/courses/${slug}/lessons/1/quizzes/new`);

  await page.getByRole('textbox', { name: 'Quiz title' }).fill('Lesson 1 quiz');
  await page.getByRole('main').getByRole('button', { name: 'Create quiz' }).click();
  await expect(page.getByText('Quiz created')).toBeVisible();
  // We end up on /quizzes/[id]. Capture the id from the URL for the question form.
  await page.waitForURL(/\/instructor\/courses\/[^/]+\/quizzes\/[^/]+$/);

  // Question form: fill body, leave choices defaults, choose first as correct (default).
  await page.getByRole('textbox', { name: 'Question' }).fill('What is 1 + 1?');
  // The default form starts with 2 choices.
  await page
    .getByRole('textbox', { name: /Choice 1/ })
    .fill('2');
  await page
    .getByRole('textbox', { name: /Choice 2/ })
    .fill('3');
  await page.getByRole('main').getByRole('button', { name: 'Add question' }).click();
  await expect(page.getByText('Question added')).toBeVisible();

  // After submit the questions list should show our question.
  await expect(page.getByRole('heading', { name: /What is 1 \+ 1\?/ })).toBeVisible();
  // Correct marker appears next to choice "2".
  await expect(page.getByText('✓ correct')).toBeVisible();
});

test('learner is sent home from quiz authoring pages', async ({ page }) => {
  await signInAs(page, 'learner@example.com');
  await page.goto('/en/instructor/courses/intro-to-typescript/lessons/1/quizzes/new');
  await expect(page).toHaveURL(/\/en$/);
});
