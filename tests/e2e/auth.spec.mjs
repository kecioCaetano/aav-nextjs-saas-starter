import { expect, test } from '@playwright/test';
import { english, password, signout, signup, submitAuth, uniqueEmail } from './helpers.mjs';

test.beforeEach(async ({ context, baseURL }) => english(context, baseURL));

test('sign up, sign out and sign back in', async ({ page }) => {
  const email = await signup(page);
  await signout(page);
  await page.goto('/sign-in');
  await submitAuth(page, email, password, 'signin');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Team Settings' })).toBeVisible();
});

test('invalid credentials show an error without signing in', async ({ page }) => {
  await page.goto('/sign-in');
  await submitAuth(page, uniqueEmail(), 'incorrect-password', 'signin');
  await expect(page.getByText('Invalid email or password. Please try again.')).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('redirects an unauthenticated visitor from the dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in/);
});
