import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function signInAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/en/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill('demo1234');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/en');
}

async function addQuestion(
  page: import('@playwright/test').Page,
  body: string,
  choices: [string, string],
) {
  await page.getByRole('textbox', { name: 'Question' }).fill(body);
  await page.getByRole('textbox', { name: /Choice 1/ }).fill(choices[0]);
  await page.getByRole('textbox', { name: /Choice 2/ }).fill(choices[1]);
  await page.getByRole('main').getByRole('button', { name: 'Add question' }).click();
  await expect(page.getByText('Question added')).toBeVisible();
}

async function setupQuizWithTwoQuestions(
  page: import('@playwright/test').Page,
  slug: string,
) {
  await page.goto('/en/instructor/courses/new');
  await page.getByRole('textbox', { name: 'Course title' }).fill(`Course ${slug}`);
  await page.getByRole('textbox', { name: 'Slug' }).fill(slug);
  await page.getByRole('main').getByRole('button', { name: 'Create course' }).click();
  await page.waitForURL('/en');

  await page.goto(`/en/instructor/courses/${slug}/lessons/new`);
  await page.getByRole('textbox', { name: 'Lesson title' }).fill('Lesson One');
  await page.getByRole('textbox', { name: 'Content' }).fill('Body.');
  await page.getByRole('main').getByRole('button', { name: 'Save lesson' }).click();
  await page.waitForURL(`/en/instructor/courses/${slug}`);

  await page.goto(`/en/instructor/courses/${slug}/lessons/1/quizzes/new`);
  await page.getByRole('textbox', { name: 'Quiz title' }).fill('Quiz 1');
  await page.getByRole('main').getByRole('button', { name: 'Create quiz' }).click();
  await page.waitForURL(/\/instructor\/courses\/[^/]+\/quizzes\/[^/]+$/, { timeout: 60_000 });

  await addQuestion(page, 'Q Alpha', ['A', 'B']);
  await addQuestion(page, 'Q Beta', ['A', 'B']);
}

test('instructor can reorder questions via keyboard and delete one', async ({ page }) => {
  test.slow();
  await signInAs(page, 'instructor@example.com');

  const slug = `q-mgmt-${Date.now()}`;
  await setupQuizWithTwoQuestions(page, slug);

  // Confirm starting order: Alpha then Beta. The displayed order numbers come
  // from array index in SortableQuestionList.
  await expect(page.getByRole('heading', { name: /1\.\s*Q Alpha/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /2\.\s*Q Beta/ })).toBeVisible();

  // Keyboard reorder: focus Alpha's drag handle, grab, move down, drop.
  const alphaHandle = page.getByRole('button', {
    name: /Drag to reorder question 1: Q Alpha/,
  });
  await alphaHandle.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');

  await expect(page.getByText('Question order updated')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /1\.\s*Q Beta/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /2\.\s*Q Alpha/ })).toBeVisible();

  // Now delete Q Alpha (now at position 2).
  // Multiple Delete buttons exist (one per question + quiz-level Delete in header).
  // Target the question-list row by combining locators.
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Q Alpha' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByRole('heading', { name: 'Delete this question?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete question' }).click();

  await expect(page.getByText('Question deleted')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Q Alpha/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /1\.\s*Q Beta/ })).toBeVisible();
});
