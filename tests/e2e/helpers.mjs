import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';

export const password = 'original-password-123';
export const uniqueEmail = () => `e2e-${randomUUID().replaceAll('-', '').slice(0, 20)}@example.test`;

export async function english(context, baseURL) {
  await context.addCookies([{ name: 'locale', value: 'en', url: baseURL }]);
}

export async function submitAuth(page, email, secret, mode) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(secret);
  await page.getByRole('button', { name: mode === 'signup' ? 'Sign up' : 'Sign in', exact: true }).click();
}

export async function signup(page, email = uniqueEmail()) {
  await page.goto('/sign-up');
  await submitAuth(page, email, password, 'signup');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Team Settings' })).toBeVisible();
  return email;
}

export async function signout(page) {
  const trigger = page.locator('header button[data-slot="dropdown-menu-trigger"]').last();
  await trigger.click();
  await page.getByText('Sign out', { exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}
