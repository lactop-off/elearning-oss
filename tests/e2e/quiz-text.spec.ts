import { expect, test } from '@playwright/test';

// Heavy serial setup: instructor builds a course with a TEXT question, signs
// out; learner enrolls and submits; instructor grades manually.
test.describe.configure({ mode: 'serial' });

async function signInAs(page: import('@playwright/test').Page, email: string, password = 'demo1234') {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

async function signOut(page: import('@playwright/test').Page) {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Sign in' }),
  ).toBeVisible();
}

test('TEXT question: instructor authors, learner submits as pending, instructor grades to pass', async ({
  page,
}) => {
  const slug = `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const courseTitle = `Course ${slug}`;
  const lessonTitle = 'Reading lesson';
  const quizTitle = 'Reading quiz';
  const questionBody = 'In one sentence, explain why 2 is the only even prime.';
  const modelAnswer = 'Every other even number is divisible by 2, so it cannot be prime.';
  const learnerAnswer = 'Because every other even number can be divided by 2.';

  // ── Instructor: create course, lesson, TEXT quiz, publish ────────
  await signInAs(page, 'instructor@example.com');

  await page.goto('/en/instructor/courses/new');
  await page.getByRole('textbox', { name: 'Course title' }).fill(courseTitle);
  await page.getByRole('textbox', { name: 'Slug' }).fill(slug);
  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/instructor/courses/${slug}/lessons/new`);
  await page.getByRole('textbox', { name: 'Lesson title' }).fill(lessonTitle);
  await page.getByRole('textbox', { name: 'Content' }).fill('Body for text quiz lesson.');
  await page.getByRole('main').getByRole('button', { name: 'Save lesson' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}`);

  await page.goto(`/en/instructor/courses/${slug}/lessons/1/quizzes/new`);
  await page.getByRole('textbox', { name: 'Quiz title' }).fill(quizTitle);
  await page.getByRole('main').getByRole('button', { name: 'Create quiz' }).click();
  await page.waitForURL(/\/instructor\/courses\/.*\/quizzes\/[a-z0-9]+$/);
  const quizUrl = page.url();
  const quizIdMatch = quizUrl.match(/\/quizzes\/([a-z0-9]+)$/);
  expect(quizIdMatch).not.toBeNull();
  const quizId = quizIdMatch![1];

  // Pick TEXT question type, fill body + model answer, submit.
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Free text').check();
  await page.getByRole('textbox', { name: 'Question' }).fill(questionBody);
  await page.getByLabel(/Model answer/).fill(modelAnswer);
  await page.getByRole('main').getByRole('button', { name: 'Add question' }).click();
  await expect(page.getByText('Question added')).toBeVisible();

  // Publish the course so the learner can enroll.
  await page.goto('/en/instructor/courses');
  const row = page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: courseTitle }) });
  await row.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Course published')).toBeVisible();

  await signOut(page);

  // ── Learner: sign up, enrol, take quiz with text answer ────────
  const learnerEmail = `text-taker-${Date.now()}@example.com`;
  await page.goto('/en/sign-up');
  await page.getByRole('textbox', { name: 'Name' }).fill('Text Taker');
  await page.getByRole('textbox', { name: 'Email' }).fill(learnerEmail);
  await page.getByLabel('Password').fill('strong-password');
  await page.getByRole('main').getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/courses/${slug}`);
  await page.getByRole('main').getByRole('button', { name: 'Enroll' }).click();
  await page.waitForURL('/en/learn');

  await page.goto(`/en/learn/${slug}/quizzes/${quizId}`);
  await page.getByRole('main').getByRole('button', { name: 'Start quiz' }).click();
  await page.getByRole('textbox', { name: /Your answer for question 1/ }).fill(learnerAnswer);
  await page.getByRole('main').getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByText('Awaiting instructor review')).toBeVisible();
  await expect(page.getByText(learnerAnswer)).toBeVisible();

  await signOut(page);

  // ── Instructor: open grading queue, grade the attempt as correct ──
  await signInAs(page, 'instructor@example.com');
  await page.goto(`/en/instructor/courses/${slug}/quizzes/${quizId}/grading`);
  await expect(page.getByRole('heading', { name: 'Grading queue' })).toBeVisible();
  await expect(page.getByText('Text Taker')).toBeVisible();
  await page.getByRole('link', { name: 'Grade' }).click();

  // Detail page shows the model answer and learner answer.
  await expect(page.getByText(modelAnswer)).toBeVisible();
  await expect(page.getByText(learnerAnswer)).toBeVisible();
  await page.getByRole('button', { name: /Mark correct/ }).click();
  await page.getByRole('main').getByRole('button', { name: 'Finalize grading' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}`);

  await signOut(page);

  // ── Learner: refresh quiz page; expect a final pass result ───────
  await signInAs(page, learnerEmail, 'strong-password');
  await page.goto(`/en/learn/${slug}/quizzes/${quizId}`);
  await expect(page.getByText('You passed!')).toBeVisible();
});
