import { expect, test } from '@playwright/test';

// Heavy setup (instructor creates a fresh course, then learner signs up,
// enrolls, completes everything). Serialize so the dev server isn't
// overwhelmed and tests don't race on shared state.
test.describe.configure({ mode: 'serial' });

async function signInInstructor(page: import('@playwright/test').Page) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill('instructor@example.com');
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

async function signOut(page: import('@playwright/test').Page) {
  await page.getByRole('navigation').getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Sign in' }),
  ).toBeVisible();
}

async function instructorPublishesCourse(
  page: import('@playwright/test').Page,
  slug: string,
) {
  await page.goto(`/en/instructor/courses/${slug}`);
  // Course detail page doesn't have a Publish toggle directly; use the list.
  await page.goto('/en/instructor/courses');
  const row = page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: `Course ${slug}` }) });
  const publishButton = row.getByRole('button', { name: 'Publish' });
  if (await publishButton.count()) {
    await publishButton.click();
    await expect(page.getByText('Course published')).toBeVisible();
  }
}

async function createCourseWithLessons(
  page: import('@playwright/test').Page,
  slug: string,
  lessonTitles: string[],
) {
  await page.goto('/en/instructor/courses/new');
  await page.getByRole('textbox', { name: 'Course title' }).fill(`Course ${slug}`);
  await page.getByRole('textbox', { name: 'Slug' }).fill(slug);
  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();
  await page.waitForURL('/en');

  for (const title of lessonTitles) {
    await page.goto(`/en/instructor/courses/${slug}/lessons/new`);
    await page.getByRole('textbox', { name: 'Lesson title' }).fill(title);
    await page.getByRole('textbox', { name: 'Content' }).fill(`${title} body.`);
    await page.getByRole('main').getByRole('button', { name: 'Save lesson' }).click();
    await page.waitForURL(`/en/instructor/courses/${slug}`);
  }
}

async function freshLearnerEnrolledIn(page: import('@playwright/test').Page, slug: string) {
  const email = `completer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Completer Tester');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/courses/${slug}`);
  await page.getByRole('main').getByRole('button', { name: 'Enroll' }).click();
  await page.waitForURL('/en/learn');
}

test('completing every required lesson surfaces the completion banner + certificate', async ({
  page,
}) => {
  const slug = `complete-lessons-${Date.now()}`;
  await signInInstructor(page);
  await createCourseWithLessons(page, slug, ['Intro', 'Middle', 'Outro']);
  await instructorPublishesCourse(page, slug);
  await signOut(page);

  await freshLearnerEnrolledIn(page, slug);

  // No completion yet.
  await page.goto(`/en/learn/${slug}`);
  await expect(page.getByText('Course complete!')).toHaveCount(0);

  // Mark every required lesson complete.
  for (const order of [1, 2, 3]) {
    await page.goto(`/en/learn/${slug}/lessons/${order}`);
    await page
      .getByRole('main')
      .getByRole('button', { name: 'Mark complete' })
      .click();
    await expect(page.getByText('Lesson marked complete')).toBeVisible();
  }

  await page.goto(`/en/learn/${slug}`);
  await expect(page.getByText('Course complete!')).toBeVisible();
  await expect(page.getByText(/3 of 3 lessons completed/)).toBeVisible();
  await expect(page.getByText(/100% of required lessons done/)).toBeVisible();
  await expect(page.getByText(/CERT-/)).toBeVisible();
});

test('a required quiz blocks completion until it is passed', async ({ page }) => {
  const slug = `complete-with-quiz-${Date.now()}`;

  await signInInstructor(page);
  await createCourseWithLessons(page, slug, ['Only lesson']);

  await page.goto(`/en/instructor/courses/${slug}/lessons/1/quizzes/new`);
  await page.getByRole('textbox', { name: 'Quiz title' }).fill('Gate quiz');
  await page.getByRole('main').getByRole('button', { name: 'Create quiz' }).click();
  await page.waitForURL(/\/quizzes\/[^/]+$/);
  await page.getByRole('textbox', { name: 'Question' }).fill('Pick A');
  await page.getByRole('textbox', { name: /Choice 1/ }).fill('A is right');
  await page.getByRole('textbox', { name: /Choice 2/ }).fill('B is wrong');
  await page.getByRole('main').getByRole('button', { name: 'Add question' }).click();
  await expect(page.getByText('Question added')).toBeVisible();

  const quizUrl = page.url();
  const match = quizUrl.match(/\/quizzes\/([^/?]+)/);
  if (!match) throw new Error('Could not extract quiz id');
  const quizId = match[1];

  await instructorPublishesCourse(page, slug);
  await signOut(page);

  await freshLearnerEnrolledIn(page, slug);

  // Complete the lesson only — should NOT trigger completion because the
  // required quiz is still unpassed.
  await page.goto(`/en/learn/${slug}/lessons/1`);
  await page.getByRole('main').getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.getByText('Lesson marked complete')).toBeVisible();

  await page.goto(`/en/learn/${slug}`);
  await expect(page.getByText('Course complete!')).toHaveCount(0);
  await expect(page.getByText(/Required quizzes passed: 0 \/ 1/)).toBeVisible();

  // Pass the quiz.
  await page.goto(`/en/learn/${slug}/quizzes/${quizId}`);
  await page.getByRole('main').getByRole('button', { name: 'Start quiz' }).click();
  await page.getByRole('radio', { name: 'A is right' }).check();
  await page.getByRole('main').getByRole('button', { name: 'Submit answers' }).click();
  await expect(page.getByText('You passed!')).toBeVisible();

  // Course should now be complete.
  await page.goto(`/en/learn/${slug}`);
  await expect(page.getByText('Course complete!')).toBeVisible();
  await expect(page.getByText(/Required quizzes passed: 1 \/ 1/)).toBeVisible();
  await expect(page.getByText(/CERT-/)).toBeVisible();
});
