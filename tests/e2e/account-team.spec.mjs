import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { english, password, signout, signup, submitAuth, uniqueEmail } from './helpers.mjs';

test.beforeEach(async ({ context, baseURL }) => english(context, baseURL));

test('updates the password and signs in with the new password', async ({ page }) => {
  const email = await signup(page);
  await page.goto('/dashboard/security');
  await page.getByLabel('Current Password').fill(password);
  await page.getByLabel('New Password', { exact: true }).fill('changed-password-123');
  await page.getByLabel('Confirm New Password').fill('changed-password-123');
  await page.getByRole('button', { name: 'Update Password' }).click();
  await expect(page.getByText('Password updated successfully.')).toBeVisible();
  await signout(page);
  await page.goto('/sign-in');
  await submitAuth(page, email, password, 'signin');
  await expect(page.getByText('Invalid email or password. Please try again.')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('changed-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('invites a member and accepts the invitation through sign up', async ({ page, browser, baseURL }) => {
  await signup(page);
  const email = uniqueEmail();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Invite Member' }).click();
  await expect(page.getByText('Invitation sent successfully.')).toBeVisible();

  const sql = postgres(process.env.E2E_DATABASE_URL, { max: 1 });
  let invitation;
  try {
    [invitation] = await sql`SELECT id FROM invitations WHERE email = ${email} AND status = 'pending'`;
  } finally {
    await sql.end();
  }
  expect(invitation).toBeDefined();
  const context = await browser.newContext();
  try {
    await english(context, baseURL);
    const invitee = await context.newPage();
    await invitee.goto(`${baseURL}/sign-up?inviteId=${invitation.id}`);
    await submitAuth(invitee, email, password, 'signup');
    await expect(invitee).toHaveURL(/\/dashboard$/);
    await expect(invitee.getByText(email, { exact: true })).toBeVisible();
    const verify = postgres(process.env.E2E_DATABASE_URL, { max: 1 });
    try {
      const [membership] = await verify`
        SELECT i.status, i.team_id AS invited_team, m.team_id AS joined_team, m.role
        FROM invitations i
        JOIN users u ON u.email = i.email
        JOIN team_members m ON m.user_id = u.id
        WHERE i.id = ${invitation.id}
      `;
      expect(membership).toMatchObject({
        status: 'accepted', joined_team: membership.invited_team, role: 'member'
      });
    } finally {
      await verify.end();
    }
  } finally {
    await context.close();
  }
});

test('the invitation controls are disabled for a member', async ({ page }) => {
  const email = await signup(page);
  const sql = postgres(process.env.E2E_DATABASE_URL, { max: 1 });
  try {
    await sql`UPDATE users SET role = 'member' WHERE email = ${email}`;
    await sql`
      UPDATE team_members SET role = 'member'
      WHERE user_id = (SELECT id FROM users WHERE email = ${email})
    `;
  } finally {
    await sql.end();
  }
  await page.reload();
  await expect(page.getByText('You must be a team owner to invite new members.')).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Invite Member' })).toBeDisabled();
});

test.fixme('a member cannot bypass disabled invitation controls', async ({ page }) => {
  const memberEmail = await signup(page);
  const inviteEmail = uniqueEmail();
  const sql = postgres(process.env.E2E_DATABASE_URL, { max: 1 });
  try {
    await sql`UPDATE users SET role = 'member' WHERE email = ${memberEmail}`;
    await sql`
      UPDATE team_members SET role = 'member'
      WHERE user_id = (SELECT id FROM users WHERE email = ${memberEmail})
    `;
    await page.reload();
    await expect(page.getByText('You must be a team owner to invite new members.')).toBeVisible();
    const form = page.locator('form').filter({ has: page.getByLabel('Email', { exact: true }) });
    await form.evaluate((element) => {
      element.querySelectorAll('[disabled]').forEach((control) => control.removeAttribute('disabled'));
    });
    await page.getByLabel('Email', { exact: true }).fill(inviteEmail);
    await Promise.all([
      page.waitForResponse((response) =>
        response.request().method() === 'POST' && response.url().includes('/dashboard')
      ),
      form.evaluate((element) => element.requestSubmit())
    ]);
    const rows = await sql`SELECT id FROM invitations WHERE email = ${inviteEmail}`;
    expect(rows).toHaveLength(0);
  } finally {
    await sql.end();
  }
});
