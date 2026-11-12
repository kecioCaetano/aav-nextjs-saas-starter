import { expect, test } from '@playwright/test';
import { english, signup } from './helpers.mjs';

test.beforeEach(async ({ context, baseURL }) => english(context, baseURL));

test('rotates through slides and allows rotation to be paused', async ({ page }) => {
  await signup(page);
  const first = page.getByRole('button', { name: 'Slide 1' });
  const second = page.getByRole('button', { name: 'Slide 2' });
  await expect(first).toHaveAttribute('aria-current', 'true');
  await expect(second).toHaveAttribute('aria-current', 'true', { timeout: 15_000 });

  await page.getByRole('button', { name: 'Pause slide rotation' }).click();
  await page.locator('header').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(11_000);
  await expect(second).toHaveAttribute('aria-current', 'true');

  await page.getByRole('button', { name: 'Resume slide rotation' }).click();
  await page.locator('header').click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('button', { name: 'Slide 3' })).toHaveAttribute(
    'aria-current', 'true', { timeout: 15_000 }
  );
});

test('does not rotate when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signup(page);
  await page.waitForTimeout(11_000);
  await expect(page.getByRole('button', { name: 'Slide 1' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('button', { name: 'Pause slide rotation' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next slide' }).click();
  await expect(page.getByRole('button', { name: 'Slide 2' })).toHaveAttribute('aria-current', 'true');
});
