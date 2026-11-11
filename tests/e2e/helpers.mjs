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
  await expect(page.getByRole('link', { name: 'Welcome' })).toHaveAttribute('aria-current', 'page');
  return email;
}

export async function signout(page) {
  const toggleSidebar = page.getByRole('button', { name: 'Toggle sidebar' });
  if (await toggleSidebar.isVisible()) await toggleSidebar.click();
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  if (await settings.getAttribute('aria-expanded') === 'false') await settings.click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}
