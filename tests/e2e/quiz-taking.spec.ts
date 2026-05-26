import { expect, test } from '@playwright/test';

// Each test does heavy setup (instructor sign-in → quiz + question creation →
// sign out → learner sign-up → enroll → take). Run them serially within the
// file so the dev server isn't overwhelmed by concurrent navigation churn.
test.describe.configure({ mode: 'serial' });

const DEMO_COURSE_SLUG = 'intro-to-typescript';

async function instructorCreatesQuizWithCorrectAnswer(
  page: import('@playwright/test').Page,
) {
  // Sign in as instructor, create a quiz on lesson 1, add a question with a
  // known-correct answer.
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill('instructor@example.com');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/instructor/courses/${DEMO_COURSE_SLUG}/lessons/1/quizzes/new`);
  await page.getByRole('textbox', { name: 'Quiz title' }).fill(`Take quiz ${Date.now()}`);
  await page.getByRole('main').getByRole('button', { name: 'Create quiz' }).click();
  await page.waitForURL(/\/quizzes\/[^/]+$/);

  // Add a question with the first choice as correct ("right answer").
  await page.getByRole('textbox', { name: 'Question' }).fill('What is 1 + 1?');
  await page.getByRole('textbox', { name: /Choice 1/ }).fill('right answer');
  await page.getByRole('textbox', { name: /Choice 2/ }).fill('wrong answer');
  await page.getByRole('main').getByRole('button', { name: 'Add question' }).click();
  await expect(page.getByText('Question added')).toBeVisible();

  // Pick the quiz id from the current URL for re-use.
  const url = page.url();
  const match = url.match(/\/quizzes\/([^/?]+)/);
  if (!match) throw new Error('Could not extract quiz id from URL');
  const quizId = match[1];

  // Sign out the instructor.
  await page.getByRole('navigation').getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Sign in' }),
  ).toBeVisible();
  return quizId;
}

async function freshLearnerEnrolled(page: import('@playwright/test').Page) {
  const email = `quiz-taker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Quiz Taker');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/courses/${DEMO_COURSE_SLUG}`);
  await page.getByRole('main').getByRole('button', { name: 'Enroll' }).click();
  await page.waitForURL('/en/learn');
}

test('enrolled learner can take a quiz, pass it, and see the result', async ({ page }) => {
  const quizId = await instructorCreatesQuizWithCorrectAnswer(page);
  await freshLearnerEnrolled(page);

  await page.goto(`/en/learn/${DEMO_COURSE_SLUG}/quizzes/${quizId}`);
  await page.getByRole('main').getByRole('button', { name: 'Start quiz' }).click();

  // After starting, the take form is rendered.
  await expect(page.getByRole('group', { name: /What is 1 \+ 1\?/ })).toBeVisible();
  await page.getByRole('radio', { name: 'right answer' }).check();
  await page.getByRole('main').getByRole('button', { name: 'Submit answers' }).click();

  // The result view shows pass + score and "✓ correct" against the right answer.
  await expect(page.getByText('You passed!')).toBeVisible();
  await expect(page.getByText(/Score: 100%/)).toBeVisible();
  await expect(page.getByText('✓ correct')).toBeVisible();

  // Course detail shows the quiz as Passed.
  await page.goto(`/en/learn/${DEMO_COURSE_SLUG}`);
  await expect(
    page.getByRole('main').getByText('Passed', { exact: true }).first(),
  ).toBeVisible();
});

test('selecting the wrong answer reports a failing score and shows the right answer', async ({
  page,
}) => {
  const quizId = await instructorCreatesQuizWithCorrectAnswer(page);
  await freshLearnerEnrolled(page);

  await page.goto(`/en/learn/${DEMO_COURSE_SLUG}/quizzes/${quizId}`);
  await page.getByRole('main').getByRole('button', { name: 'Start quiz' }).click();
  await page.getByRole('radio', { name: 'wrong answer' }).check();
  await page.getByRole('main').getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByText('Not quite there yet')).toBeVisible();
  await expect(page.getByText(/Score: 0%/)).toBeVisible();
  // "your answer" marker appears next to the wrong choice; "✓ correct" next to the right one.
  await expect(page.getByText('your answer')).toBeVisible();
  await expect(page.getByText('✓ correct')).toBeVisible();
});

test('non-enrolled visitor gets a 404 on the learner quiz page', async ({ page }) => {
  const quizId = await instructorCreatesQuizWithCorrectAnswer(page);
  // Brand new account that does not enroll.
  const email = `lurker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Lurker');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');

  const response = await page.goto(`/en/learn/${DEMO_COURSE_SLUG}/quizzes/${quizId}`);
  expect(response?.status()).toBe(404);
});
