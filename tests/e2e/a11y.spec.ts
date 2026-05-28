import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

/**
 * 主要画面の WCAG 2.1 AA を axe で自動検証する。
 * critical / serious 違反が 0 であることをアサート。
 * minor / moderate は将来課題として通すが、ログには出す。
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function audit(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  if (results.violations.length > 0) {
    // 全件サマリを残す (PASS でも minor/moderate を可視化)。
    console.log(
      `[a11y:${name}] violations:`,
      results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    );
  }
  expect(blocking, `${name}: critical/serious violations`).toEqual([]);
}

test.describe('a11y (signed out)', () => {
  test('home', async ({ page }) => {
    await page.goto('/ja');
    await audit(page, 'home');
  });
  test('catalog', async ({ page }) => {
    await page.goto('/ja/courses');
    await audit(page, 'catalog');
  });
  test('course detail', async ({ page }) => {
    await page.goto('/ja/courses/intro-to-typescript');
    await audit(page, 'course-detail');
  });
  test('sign-in', async ({ page }) => {
    await page.goto('/ja/sign-in');
    await audit(page, 'sign-in');
  });
  test('sign-up', async ({ page }) => {
    await page.goto('/ja/sign-up');
    await audit(page, 'sign-up');
  });
});

test.describe('a11y (signed in as instructor)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ja/sign-in');
    await page.getByRole('textbox', { name: 'メールアドレス' }).fill('instructor@example.com');
    await page.getByLabel('パスワード').fill('demo1234');
    await page.getByRole('main').getByRole('button', { name: 'サインイン' }).click();
    await page.waitForURL('/ja');
  });

  test('my courses', async ({ page }) => {
    await page.goto('/ja/instructor/courses');
    await audit(page, 'instructor-courses');
  });
  test('new course form', async ({ page }) => {
    await page.goto('/ja/instructor/courses/new');
    await audit(page, 'instructor-new-course');
  });
});
