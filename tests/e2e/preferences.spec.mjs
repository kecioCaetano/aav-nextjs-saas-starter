import { expect, test } from '@playwright/test';
import { english, signup } from './helpers.mjs';

test.beforeEach(async ({ context, baseURL }) => english(context, baseURL));

test('language and text size persist across auth, landing and dashboard pages', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByLabel('Select language').focus();
  await page.keyboard.press('End');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.locator('select').filter({ has: page.locator('option[value="extra-large"]') }).focus();
  await page.keyboard.press('End');
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'extra-large');
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'extra-large');
  await page.locator('a').filter({ has: page.locator('img[alt="Proller"]') }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'extra-large');
  await page.locator('select').filter({ has: page.locator('option[value="en"]') }).focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await signup(page);
  await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'extra-large');
  await page.reload();
  await expect(page.getByLabel('Text size')).toHaveValue('extra-large');
  await page.goto('/sign-in');
  await expect(page.getByLabel('Text size')).toHaveValue('extra-large');
});

test('theme persists through reload and navigation including auth pages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.getByRole('menuitem', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.goto('/sign-in');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.goto('/sign-up');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await signup(page);
  await expect(page.locator('html')).toHaveClass(/dark/);
});
