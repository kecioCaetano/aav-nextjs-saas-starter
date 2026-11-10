import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { activityLogs, invitations, teamMembers, teams, users } from '../lib/db/schema';

const mocks = vi.hoisted(() => ({ db: undefined, getUser: vi.fn(), setSession: vi.fn() }));
vi.mock('@/lib/db/drizzle', () => ({ db: mocks.db }));
vi.mock('@/lib/db/queries', async (importOriginal) => ({
  ...await importOriginal(),
  getUser: mocks.getUser
}));
vi.mock('@/lib/auth/session', async (importOriginal) => ({
  ...await importOriginal(),
  setSession: mocks.setSession
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key) => key
}));
vi.mock('next/navigation', () => ({
  redirect: (path) => { throw new Error(`redirect:${path}`); }
}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/payments/stripe', () => ({ createCheckoutSession: vi.fn() }));

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('account and team actions with PostgreSQL', () => {
  const schemaName = `vitest_${randomUUID().replaceAll('-', '')}`;
  let client;
  let admin;
  let schemaCreated = false;
  let actions;
  let owner;
  let team;

  beforeAll(async () => {
    admin = postgres(databaseUrl, { max: 1 });
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    schemaCreated = true;
    client = postgres(databaseUrl, { max: 3, connection: { search_path: schemaName } });
    const migration = await readFile(
      new URL('../lib/db/migrations/0000_soft_the_anarchist.sql', import.meta.url),
      'utf8'
    );
    for (const statement of migration.split('--> statement-breakpoint')) {
      await client.unsafe(statement.replaceAll('"public".', `"${schemaName}".`));
    }
    mocks.db = drizzle(client);
    actions = await import('../app/(login)/actions');

    [owner] = await mocks.db.insert(users).values({
      email: 'owner@example.test', passwordHash: 'unused', role: 'owner'
    }).returning();
    [team] = await mocks.db.insert(teams).values({ name: 'Test team' }).returning();
    await mocks.db.insert(teamMembers).values({
      userId: owner.id, teamId: team.id, role: 'owner'
    });
  });

  beforeEach(() => {
    mocks.getUser.mockResolvedValue(owner);
    mocks.setSession.mockClear();
  });

  afterAll(async () => {
    if (admin) {
      try {
        if (client) await client.end();
        if (schemaCreated) await admin`DROP SCHEMA ${admin(schemaName)} CASCADE`;
      } finally {
        await admin.end();
      }
    }
  });

  it('creates an invitation and rejects a duplicate pending invitation', async () => {
    const data = form({ email: 'invitee@example.test', role: 'member' });
    expect(await actions.inviteTeamMember({}, data)).toEqual({ success: 'invitationSent' });
    expect(await actions.inviteTeamMember({}, data)).toEqual({ error: 'invitationExists' });
    const stored = await mocks.db.select().from(invitations)
      .where(eq(invitations.email, 'invitee@example.test'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      teamId: team.id, invitedBy: owner.id, role: 'member', status: 'pending'
    });
  });

  it('rejects inviting an existing member without inserting an invitation', async () => {
    const [member] = await mocks.db.insert(users).values({
      email: 'member@example.test', passwordHash: 'unused'
    }).returning();
    await mocks.db.insert(teamMembers).values({
      userId: member.id, teamId: team.id, role: 'member'
    });
    expect(await actions.inviteTeamMember({}, form({
      email: member.email, role: 'member'
    }))).toEqual({ error: 'alreadyMember' });
    expect(await mocks.db.select().from(invitations)
      .where(eq(invitations.email, member.email))).toHaveLength(0);
  });

  it('rejects an invalid invitation without creating a user or session', async () => {
    const email = 'invalid-invite@example.test';
    expect(await actions.signUp({}, form({
      email, password: 'valid-password', inviteId: '999999'
    }))).toMatchObject({ error: 'invalidInvitation' });
    expect(await mocks.db.select().from(users).where(eq(users.email, email))).toHaveLength(0);
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it('creates an invited user and membership with the invitation role', async () => {
    const email = 'accepted@example.test';
    const [invitation] = await mocks.db.insert(invitations).values({
      email, teamId: team.id, invitedBy: owner.id, role: 'member'
    }).returning();
    await expect(actions.signUp({}, form({
      email, password: 'valid-password', inviteId: String(invitation.id)
    }))).rejects.toThrow('redirect:/dashboard');
    const [user] = await mocks.db.select().from(users).where(eq(users.email, email));
    const [member] = await mocks.db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
    const [accepted] = await mocks.db.select().from(invitations).where(eq(invitations.id, invitation.id));
    expect(user.role).toBe('member');
    expect(member).toMatchObject({ teamId: team.id, role: 'member' });
    expect(accepted.status).toBe('accepted');
    expect(mocks.setSession).toHaveBeenCalledWith(expect.objectContaining({ id: user.id }));
  });

  it('does not claim an invitation for a different email', async () => {
    const [invitation] = await mocks.db.insert(invitations).values({
      email: 'intended@example.test', teamId: team.id, invitedBy: owner.id, role: 'member'
    }).returning();
    const email = 'other@example.test';
    expect(await actions.signUp({}, form({
      email, password: 'valid-password', inviteId: String(invitation.id)
    }))).toMatchObject({ error: 'invalidInvitation' });
    expect(await mocks.db.select().from(users).where(eq(users.email, email))).toHaveLength(0);
    const [pending] = await mocks.db.select().from(invitations).where(eq(invitations.id, invitation.id));
    expect(pending.status).toBe('pending');
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it('rolls back the user and invitation claim when signup activity fails', async () => {
    const email = 'rollback@example.test';
    const [invitation] = await mocks.db.insert(invitations).values({
      email, teamId: team.id, invitedBy: owner.id, role: 'member'
    }).returning();
    const activityBefore = await mocks.db.select().from(activityLogs)
      .where(eq(activityLogs.action, 'ACCEPT_INVITATION'));
    await client.unsafe(`
      CREATE FUNCTION fail_signup_activity() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action = 'SIGN_UP' THEN RAISE EXCEPTION 'test signup failure'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER fail_signup_activity BEFORE INSERT ON activity_logs
      FOR EACH ROW EXECUTE FUNCTION fail_signup_activity();
    `);
    try {
      await expect(actions.signUp({}, form({
        email, password: 'valid-password', inviteId: String(invitation.id)
      }))).rejects.toThrow('test signup failure');
      expect(await mocks.db.select().from(users).where(eq(users.email, email))).toHaveLength(0);
      const [pending] = await mocks.db.select().from(invitations).where(eq(invitations.id, invitation.id));
      expect(pending.status).toBe('pending');
      expect(await mocks.db.select().from(activityLogs)
        .where(eq(activityLogs.action, 'ACCEPT_INVITATION'))).toHaveLength(activityBefore.length);
      expect(mocks.setSession).not.toHaveBeenCalled();

      const newEmail = 'new-team-rollback@example.test';
      await expect(actions.signUp({}, form({
        email: newEmail, password: 'valid-password'
      }))).rejects.toThrow('test signup failure');
      expect(await mocks.db.select().from(users).where(eq(users.email, newEmail))).toHaveLength(0);
      expect(await mocks.db.select().from(teams)
        .where(eq(teams.name, `${newEmail}'s Team`))).toHaveLength(0);
      expect(mocks.setSession).not.toHaveBeenCalled();
    } finally {
      await client.unsafe('DROP TRIGGER fail_signup_activity ON activity_logs');
      await client.unsafe('DROP FUNCTION fail_signup_activity()');
    }
  });

  it('accepts a pending invitation at most once under concurrent signup', async () => {
    const email = 'concurrent@example.test';
    const [invitation] = await mocks.db.insert(invitations).values({
      email, teamId: team.id, invitedBy: owner.id, role: 'member'
    }).returning();
    const createForm = () => form({
      email, password: 'valid-password', inviteId: String(invitation.id)
    });
    const results = await Promise.allSettled([
      actions.signUp({}, createForm()), actions.signUp({}, createForm())
    ]);
    expect(results.filter((result) =>
      result.status === 'rejected' && result.reason.message === 'redirect:/dashboard'
    )).toHaveLength(1);
    expect(results.filter((result) =>
      result.status === 'fulfilled' &&
      ['invalidInvitation', 'createUserFailed'].includes(result.value.error)
    )).toHaveLength(1);
    const created = await mocks.db.select().from(users).where(eq(users.email, email));
    expect(created).toHaveLength(1);
    expect(await mocks.db.select().from(teamMembers)
      .where(eq(teamMembers.userId, created[0].id))).toHaveLength(1);
    expect(mocks.setSession).toHaveBeenCalledOnce();
  });
});
