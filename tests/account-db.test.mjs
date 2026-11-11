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
    expect(await mocks.db.select().from(activityLogs)
      .where(eq(activityLogs.action, 'INVITE_TEAM_MEMBER')))
      .toEqual([expect.objectContaining({ teamId: team.id, userId: owner.id })]);
  });

  it('rejects invitations by a member even if their user role is owner', async () => {
    const [actor] = await mocks.db.insert(users).values({
      email: 'member-actor@example.test', passwordHash: 'unused', role: 'owner'
    }).returning();
    await mocks.db.insert(teamMembers).values({
      userId: actor.id, teamId: team.id, role: 'member'
    });
    mocks.getUser.mockResolvedValue(actor);
    const before = await mocks.db.select().from(activityLogs)
      .where(eq(activityLogs.action, 'INVITE_TEAM_MEMBER'));
    expect(await actions.inviteTeamMember({}, form({
      email: 'forbidden@example.test', role: 'owner'
    }))).toEqual({ error: 'inviteOwnerRequired' });
    expect(await mocks.db.select().from(invitations)
      .where(eq(invitations.email, 'forbidden@example.test'))).toHaveLength(0);
    expect(await mocks.db.select().from(activityLogs)
      .where(eq(activityLogs.action, 'INVITE_TEAM_MEMBER'))).toHaveLength(before.length);
  });

  it('rolls back the invitation if activity logging fails', async () => {
    const email = 'invitation-rollback@example.test';
    await client.unsafe(`
      CREATE FUNCTION fail_invite_activity() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action = 'INVITE_TEAM_MEMBER' THEN RAISE EXCEPTION 'test invitation failure'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER fail_invite_activity BEFORE INSERT ON activity_logs
      FOR EACH ROW EXECUTE FUNCTION fail_invite_activity();
    `);
    try {
      await expect(actions.inviteTeamMember({}, form({ email, role: 'member' })))
        .rejects.toThrow('test invitation failure');
      expect(await mocks.db.select().from(invitations)
        .where(eq(invitations.email, email))).toHaveLength(0);
    } finally {
      await client.unsafe('DROP TRIGGER fail_invite_activity ON activity_logs');
      await client.unsafe('DROP FUNCTION fail_invite_activity()');
    }
  });

  it('serializes concurrent invitations by different owners of the same team', async () => {
    const [secondOwner] = await mocks.db.insert(users).values({
      email: 'second-owner@example.test', passwordHash: 'unused', role: 'owner'
    }).returning();
    await mocks.db.insert(teamMembers).values({
      userId: secondOwner.id, teamId: team.id, role: 'owner'
    });
    mocks.getUser.mockResolvedValueOnce(owner).mockResolvedValueOnce(secondOwner);
    const email = 'concurrent-invite@example.test';
    const results = await Promise.all([
      actions.inviteTeamMember({}, form({ email, role: 'member' })),
      actions.inviteTeamMember({}, form({ email, role: 'member' }))
    ]);
    expect(results).toContainEqual({ success: 'invitationSent' });
    expect(results).toContainEqual({ error: 'invitationExists' });
    expect(await mocks.db.select().from(invitations)
      .where(eq(invitations.email, email))).toHaveLength(1);
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

  it('removes a team member and records the activity', async () => {
    const [user] = await mocks.db.insert(users).values({
      email: 'remove@example.test', passwordHash: 'unused'
    }).returning();
    const [member] = await mocks.db.insert(teamMembers).values({
      userId: user.id, teamId: team.id, role: 'member'
    }).returning();
    expect(await actions.removeTeamMember({}, form({ memberId: String(member.id) })))
      .toEqual({ success: 'memberRemoved' });
    expect(await mocks.db.select().from(teamMembers)
      .where(eq(teamMembers.id, member.id))).toHaveLength(0);
    expect(await mocks.db.select().from(activityLogs)
      .where(eq(activityLogs.action, 'REMOVE_TEAM_MEMBER')))
      .toEqual([expect.objectContaining({ teamId: team.id, userId: owner.id })]);
  });

  it('does not remove a member from another team or log a removal', async () => {
    const [otherTeam] = await mocks.db.insert(teams).values({ name: 'Other team' }).returning();
    const [user] = await mocks.db.insert(users).values({
      email: 'other-team@example.test', passwordHash: 'unused'
    }).returning();
    const [member] = await mocks.db.insert(teamMembers).values({
      userId: user.id, teamId: otherTeam.id, role: 'member'
    }).returning();
    const before = await mocks.db.select().from(activityLogs)
      .where(eq(activityLogs.action, 'REMOVE_TEAM_MEMBER'));
    expect(await actions.removeTeamMember({}, form({ memberId: String(member.id) })))
      .toEqual({ error: 'memberNotFound' });
    expect(await mocks.db.select().from(teamMembers)
      .where(eq(teamMembers.id, member.id))).toHaveLength(1);
    expect(await mocks.db.select().from(activityLogs)
      .where(eq(activityLogs.action, 'REMOVE_TEAM_MEMBER'))).toHaveLength(before.length);
  });

  it('rejects removal by a non-owner', async () => {
    const [actor] = await mocks.db.insert(users).values({
      email: 'actor@example.test', passwordHash: 'unused', role: 'owner'
    }).returning();
    await mocks.db.insert(teamMembers).values({ userId: actor.id, teamId: team.id, role: 'member' });
    const [targetUser] = await mocks.db.insert(users).values({
      email: 'target@example.test', passwordHash: 'unused'
    }).returning();
    const [target] = await mocks.db.insert(teamMembers).values({
      userId: targetUser.id, teamId: team.id, role: 'member'
    }).returning();
    mocks.getUser.mockResolvedValue(actor);
    expect(await actions.removeTeamMember({}, form({ memberId: String(target.id) })))
      .toEqual({ error: 'ownerRequired' });
    expect(await mocks.db.select().from(teamMembers)
      .where(eq(teamMembers.id, target.id))).toHaveLength(1);
  });

  it('does not allow an owner to remove their own membership', async () => {
    const [membership] = await mocks.db.select().from(teamMembers)
      .where(eq(teamMembers.userId, owner.id));
    expect(await actions.removeTeamMember({}, form({ memberId: String(membership.id) })))
      .toEqual({ error: 'cannotRemoveSelf' });
    expect(await mocks.db.select().from(teamMembers)
      .where(eq(teamMembers.id, membership.id))).toHaveLength(1);
  });

  it('rolls back member removal if activity logging fails', async () => {
    const [user] = await mocks.db.insert(users).values({
      email: 'remove-rollback@example.test', passwordHash: 'unused'
    }).returning();
    const [member] = await mocks.db.insert(teamMembers).values({
      userId: user.id, teamId: team.id, role: 'member'
    }).returning();
    await client.unsafe(`
      CREATE FUNCTION fail_removal_activity() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action = 'REMOVE_TEAM_MEMBER' THEN RAISE EXCEPTION 'test removal failure'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER fail_removal_activity BEFORE INSERT ON activity_logs
      FOR EACH ROW EXECUTE FUNCTION fail_removal_activity();
    `);
    try {
      await expect(actions.removeTeamMember({}, form({ memberId: String(member.id) })))
        .rejects.toThrow('test removal failure');
      expect(await mocks.db.select().from(teamMembers)
        .where(eq(teamMembers.id, member.id))).toHaveLength(1);
    } finally {
      await client.unsafe('DROP TRIGGER fail_removal_activity ON activity_logs');
      await client.unsafe('DROP FUNCTION fail_removal_activity()');
    }
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
