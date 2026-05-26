import { expect, test } from '@playwright/test';

// Heavy setup (instructor creates course + lesson + multi-choice quiz, then a
// fresh learner enrolls and takes the quiz multiple times). Serialize within
// the file so the dev server isn't flooded by concurrent navigation.
test.describe.configure({ mode: 'serial' });

async function signInAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
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

async function instructorBuildsMultiChoiceCourse(
  page: import('@playwright/test').Page,
): Promise<{ slug: string; quizId: string }> {
  await signInAs(page, 'instructor@example.com');

  const slug = `multi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await page.goto('/en/instructor/courses/new');
  await page.getByRole('textbox', { name: 'Course title' }).fill(`Course ${slug}`);
  await page.getByRole('textbox', { name: 'Slug' }).fill(slug);
  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/instructor/courses/${slug}/lessons/new`);
  await page.getByRole('textbox', { name: 'Lesson title' }).fill('Primes lesson');
  await page.getByRole('textbox', { name: 'Content' }).fill('A prime number is...');
  await page.getByRole('main').getByRole('button', { name: 'Save lesson' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}`);

  // Publish so the learner can enroll.
  await page.goto('/en/instructor/courses');
  const row = page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: `Course ${slug}` }) });
  await row.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Course published')).toBeVisible();

  // Quiz + multi-choice question (correct: 2 and 5; wrong: 4 and 6).
  await page.goto(`/en/instructor/courses/${slug}/lessons/1/quizzes/new`);
  await page.getByRole('textbox', { name: 'Quiz title' }).fill('Primes quiz');
  await page.getByRole('main').getByRole('button', { name: 'Create quiz' }).click();
  await page.waitForURL(/\/quizzes\/[^/]+$/);

  // Switch question type to Multiple choice.
  await page.getByRole('radio', { name: 'Multiple choice' }).check();

  await page.getByRole('textbox', { name: 'Question' }).fill('Which are primes?');
  await page.getByRole('textbox', { name: /Choice 1/ }).fill('2');
  await page.getByRole('textbox', { name: /Choice 2/ }).fill('4');
  // Need 4 choices to mark 2 of 4 correct. Add two more.
  await page.getByRole('button', { name: 'Add choice' }).click();
  await page.getByRole('textbox', { name: /Choice 3/ }).fill('5');
  await page.getByRole('button', { name: 'Add choice' }).click();
  await page.getByRole('textbox', { name: /Choice 4/ }).fill('6');

  // Mark choices 1 (=2) and 3 (=5) as correct.
  await page.getByRole('checkbox', { name: 'Mark choice 1 as correct' }).check();
  await page.getByRole('checkbox', { name: 'Mark choice 3 as correct' }).check();

  await page.getByRole('main').getByRole('button', { name: 'Add question' }).click();
  await expect(page.getByText('Question added')).toBeVisible();

  // Confirm the rendered question lists exactly two ✓ correct markers.
  await expect(page.getByText('✓ correct')).toHaveCount(2);

  const url = page.url();
  const match = url.match(/\/quizzes\/([^/?]+)/);
  if (!match) throw new Error('Could not extract quiz id');
  const quizId = match[1];

  await signOut(page);
  return { slug, quizId };
}

async function freshLearnerEnrolledIn(page: import('@playwright/test').Page, slug: string) {
  const email = `multi-taker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Multi Taker');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/courses/${slug}`);
  await page.getByRole('main').getByRole('button', { name: 'Enroll' }).click();
  await page.waitForURL('/en/learn');
}

test('multi-choice quiz: picking exactly the correct set passes', async ({ page }) => {
  const { slug, quizId } = await instructorBuildsMultiChoiceCourse(page);
  await freshLearnerEnrolledIn(page, slug);

  await page.goto(`/en/learn/${slug}/quizzes/${quizId}`);
  await page.getByRole('main').getByRole('button', { name: 'Start quiz' }).click();

  // Take form: render as checkboxes (multi-choice). Pick both correct.
  await page.getByRole('checkbox', { name: '2' }).check();
  await page.getByRole('checkbox', { name: '5' }).check();
  await page.getByRole('main').getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByText('You passed!')).toBeVisible();
  await expect(page.getByText(/Score: 100%/)).toBeVisible();
});

test('multi-choice quiz: partial selection fails (all-or-nothing)', async ({ page }) => {
  const { slug, quizId } = await instructorBuildsMultiChoiceCourse(page);
  await freshLearnerEnrolledIn(page, slug);

  await page.goto(`/en/learn/${slug}/quizzes/${quizId}`);
  await page.getByRole('main').getByRole('button', { name: 'Start quiz' }).click();

  // Only one of the two correct answers selected.
  await page.getByRole('checkbox', { name: '2' }).check();
  await page.getByRole('main').getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByText('Not quite there yet')).toBeVisible();
  await expect(page.getByText(/Score: 0%/)).toBeVisible();
  // The result view marks both true answers as correct.
  await expect(page.getByText('✓ correct')).toHaveCount(2);
});

test('multi-choice quiz: correct + extra wrong selection fails', async ({ page }) => {
  const { slug, quizId } = await instructorBuildsMultiChoiceCourse(page);
  await freshLearnerEnrolledIn(page, slug);

  await page.goto(`/en/learn/${slug}/quizzes/${quizId}`);
  await page.getByRole('main').getByRole('button', { name: 'Start quiz' }).click();

  // Both correct AND one wrong — still fails (over-select).
  await page.getByRole('checkbox', { name: '2' }).check();
  await page.getByRole('checkbox', { name: '5' }).check();
  await page.getByRole('checkbox', { name: '4' }).check();
  await page.getByRole('main').getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByText('Not quite there yet')).toBeVisible();
  await expect(page.getByText(/Score: 0%/)).toBeVisible();
});
