import { expect, test } from '@playwright/test';
import { english, signup } from './helpers.mjs';

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  test(`auth controls and dashboard navigation remain usable at ${viewport.width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize(viewport);
    await english(context, baseURL);
    await page.goto('/sign-up');
    await page.getByLabel('Text size').focus();
    await page.keyboard.press('End');
    await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'extra-large');
    await page.getByLabel('Select language').focus();
    await expect(page.getByLabel('Select language')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Text size')).toBeFocused();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await signup(page);
    if (viewport.width < 1024) {
      await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    }
    await page.getByRole('link', { name: 'Security' }).click();
    await expect(page.getByRole('heading', { name: 'Security Settings' })).toBeVisible();
    await expect(page.getByLabel('Current Password')).toBeVisible();
  });
}
