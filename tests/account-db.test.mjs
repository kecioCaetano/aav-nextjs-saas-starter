import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { invitations, teamMembers, teams, users } from '../lib/db/schema';

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
  let schemaCreated = false;
  let actions;
  let owner;
  let team;

  beforeAll(async () => {
    client = postgres(databaseUrl, { max: 1 });
    await client`CREATE SCHEMA ${client(schemaName)}`;
    schemaCreated = true;
    await client`SET search_path TO ${client(schemaName)}`;
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
    if (client) {
      try {
        if (schemaCreated) await client`DROP SCHEMA ${client(schemaName)} CASCADE`;
      } finally {
        await client.end();
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

  it('rejects an invalid invitation without creating a membership or session', async () => {
    const email = 'invalid-invite@example.test';
    expect(await actions.signUp({}, form({
      email, password: 'valid-password', inviteId: '999999'
    }))).toMatchObject({ error: 'invalidInvitation' });
    const createdUsers = await mocks.db.select().from(users).where(eq(users.email, email));
    expect(createdUsers).toHaveLength(1);
    expect(await mocks.db.select().from(teamMembers)
      .where(eq(teamMembers.userId, createdUsers[0].id))).toHaveLength(0);
    expect(mocks.setSession).not.toHaveBeenCalled();
  });
});
