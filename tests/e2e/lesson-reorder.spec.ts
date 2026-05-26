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

test('instructor can reorder lessons via keyboard (a11y path)', async ({ page }) => {
  await signInAs(page, 'instructor@example.com');

  const slug = `lesson-reorder-${Date.now()}`;
  await createCourse(page, slug);
  await addLesson(page, slug, 'Lesson Alpha');
  await addLesson(page, slug, 'Lesson Beta');

  await page.goto(`/en/instructor/courses/${slug}`);
  await expect(page.getByRole('heading', { name: /1\.\s*Lesson Alpha/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /2\.\s*Lesson Beta/ })).toBeVisible();

  // dnd-kit KeyboardSensor: focus a drag handle, Space to grab,
  // ArrowDown to step, Space to drop. The handle's aria-label encodes the
  // current displayed order so we can target the first lesson's handle.
  // dnd-kit's sortableKeyboardCoordinates moves the active item by the
  // displacement of the next adjacent item, but with card-sized rows we
  // need to wait between keys for the layout to settle before the next
  // ArrowDown reads the new neighbour coordinates.
  const alphaHandle = page.getByRole('button', {
    name: /Drag to reorder lesson 1: Lesson Alpha/,
  });
  await alphaHandle.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');

  await expect(page.getByText('Order updated')).toBeVisible({ timeout: 10_000 });

  // After the server-side update + router.refresh(), the displayed numbering
  // should reflect the new order. Beta is now lesson 1.
  await expect(page.getByRole('heading', { name: /1\.\s*Lesson Beta/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /2\.\s*Lesson Alpha/ })).toBeVisible();
});

test('learner cannot reorder lessons', async ({ page }) => {
  // Non-owner instructor — learner — should never see drag handles since the
  // instructor course detail page is gated by requireRole and bounces learners
  // before any UI renders.
  await signInAs(page, 'learner@example.com');
  await page.goto('/en/instructor/courses/anything');
  await expect(page).toHaveURL(/\/en$/);
});
