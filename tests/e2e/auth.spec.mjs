import { expect, test } from '@playwright/test';
import { english, password, signout, signup, submitAuth, uniqueEmail } from './helpers.mjs';

test.beforeEach(async ({ context, baseURL }) => english(context, baseURL));

test('sign up, sign out and sign back in', async ({ page }) => {
  const email = await signup(page);
  await expect(page.locator('header [data-slot="dropdown-menu-trigger"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await signout(page);
  await page.goto('/sign-in');
  await submitAuth(page, email, password, 'signin');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Welcome' })).toHaveAttribute('aria-current', 'page');
});

test('sign out is translated in the Settings menu', async ({ page }) => {
  await signup(page);
  await page.getByLabel('Select language').selectOption('pt');
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
  await page.getByLabel('Selecione o idioma').selectOption('es');
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
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
