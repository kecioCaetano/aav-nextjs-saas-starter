import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { invitations, users } from '../lib/db/schema';
import {
  deleteAccount, inviteTeamMember, removeTeamMember, signIn, signUp,
  updateAccount, updatePassword
} from '../app/(login)/actions';

const mocks = vi.hoisted(() => {
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const leftJoin = vi.fn();
  leftJoin.mockReturnValue({ leftJoin, where });
  const from = vi.fn(() => ({ leftJoin, where }));
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const updateWhere = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: updateWhere }));
  return {
    getUser: vi.fn(), getUserWithTeam: vi.fn(), comparePasswords: vi.fn(),
    hashPassword: vi.fn(), setSession: vi.fn(), redirect: vi.fn(),
    cookies: vi.fn(), createCheckoutSession: vi.fn(), getTranslations: vi.fn(),
    db: {
      select: vi.fn(() => ({ from })),
      insert: vi.fn(() => ({ values })),
      update: vi.fn(() => ({ set })),
      delete: vi.fn(() => ({ where: updateWhere })),
      transaction: vi.fn()
    },
    limit, where, values, returning, set, updateWhere
  };
});

vi.mock('@/lib/db/drizzle', () => ({ db: mocks.db }));
vi.mock('@/lib/db/queries', () => ({
  getUser: mocks.getUser,
  getUserWithTeam: mocks.getUserWithTeam,
  getTeamForUser: vi.fn()
}));
vi.mock('@/lib/auth/session', () => ({
  comparePasswords: mocks.comparePasswords,
  hashPassword: mocks.hashPassword,
  setSession: mocks.setSession
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/payments/stripe', () => ({ createCheckoutSession: mocks.createCheckoutSession }));
vi.mock('next-intl/server', () => ({
  getTranslations: mocks.getTranslations
}));

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const user = { id: 1, email: 'owner@example.com', passwordHash: 'stored-hash' };
const passwordFields = {
  currentPassword: 'old-password',
  newPassword: 'new-password',
  confirmPassword: 'new-password'
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue(user);
  mocks.getUserWithTeam.mockResolvedValue({ user, teamId: 10 });
  mocks.getTranslations.mockResolvedValue((key) => key);
  mocks.comparePasswords.mockResolvedValue(true);
  mocks.hashPassword.mockResolvedValue('new-hash');
  mocks.limit.mockResolvedValue([]);
  mocks.returning.mockResolvedValue([user]);
  mocks.db.transaction.mockImplementation((callback) => callback(mocks.db));
  mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); });
});

describe('account actions', () => {
  it.each([updateAccount, updatePassword, deleteAccount, inviteTeamMember, removeTeamMember])(
    'rejects unauthenticated access to protected actions',
    async (action) => {
      mocks.getUser.mockResolvedValue(null);
      await expect(action({}, form({}))).rejects.toThrow('User is not authenticated');
      expect(mocks.db.select).not.toHaveBeenCalled();
      expect(mocks.db.update).not.toHaveBeenCalled();
      expect(mocks.db.insert).not.toHaveBeenCalled();
      expect(mocks.db.delete).not.toHaveBeenCalled();
    }
  );

  it('rejects invalid sign-in input before querying', async () => {
    expect(await signIn({}, form({ email: 'invalid', password: 'password' })))
      .toEqual({ error: 'email' });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it('rejects unknown sign-in email without establishing a session', async () => {
    expect(await signIn({}, form({ email: 'user@example.com', password: 'password' })))
      .toMatchObject({ error: 'invalidCredentials' });
    expect(mocks.comparePasswords).not.toHaveBeenCalled();
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it('rejects a wrong sign-in password without establishing a session', async () => {
    mocks.limit.mockResolvedValue([{ user, team: null }]);
    mocks.comparePasswords.mockResolvedValue(false);
    expect(await signIn({}, form({ email: user.email, password: 'wrong-password' })))
      .toMatchObject({ error: 'invalidCredentials' });
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it('creates a session and redirects after valid sign-in', async () => {
    mocks.limit.mockResolvedValue([{ user, team: null }]);
    await expect(signIn({}, form({ email: user.email, password: 'valid-password' })))
      .rejects.toThrow('redirect:/dashboard');
    expect(mocks.comparePasswords).toHaveBeenCalledWith('valid-password', user.passwordHash);
    expect(mocks.setSession).toHaveBeenCalledWith(user);
  });

  it.each([
    ['incorrect current password', false, passwordFields, 'incorrectCurrentPassword'],
    ['unchanged password', true, { ...passwordFields, newPassword: 'old-password', confirmPassword: 'old-password' }, 'passwordUnchanged'],
    ['mismatched confirmation', true, { ...passwordFields, confirmPassword: 'different-password' }, 'passwordMismatch']
  ])('rejects %s without updating', async (_, valid, fields, error) => {
    mocks.comparePasswords.mockResolvedValue(valid);
    expect(await updatePassword({}, form(fields))).toMatchObject({ error });
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it('hashes and saves a valid new password', async () => {
    mocks.getUserWithTeam.mockResolvedValue({ user, teamId: null });
    expect(await updatePassword({}, form(passwordFields))).toEqual({ success: 'passwordUpdated' });
    expect(mocks.hashPassword).toHaveBeenCalledWith('new-password');
    expect(mocks.set).toHaveBeenCalledWith({ passwordHash: 'new-hash' });
    expect(new PgDialect().sqlToQuery(mocks.updateWhere.mock.calls[0][0]).params)
      .toEqual([user.id]);
  });

  it('rejects account deletion with the wrong password', async () => {
    mocks.comparePasswords.mockResolvedValue(false);
    expect(await deleteAccount({}, form({ password: 'wrong-password' })))
      .toMatchObject({ error: 'deleteIncorrectPassword' });
    expect(mocks.db.update).not.toHaveBeenCalled();
    expect(mocks.db.delete).not.toHaveBeenCalled();
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it('rejects an invalid invitation before creating a user or session', async () => {
    mocks.returning.mockResolvedValueOnce([]);
    expect(await signUp({}, form({
      email: 'new@example.com', password: 'new-password', inviteId: '123'
    }))).toMatchObject({ error: 'invalidInvitation' });
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(mocks.setSession).not.toHaveBeenCalled();
  });

  it.each(['abc', '1abc', '0', '-1', '2147483648'])(
    'rejects malformed invitation ID %s before starting a transaction', async (inviteId) => {
      expect(await signUp({}, form({
        email: 'new@example.com', password: 'new-password', inviteId
      }))).toMatchObject({ error: 'invalidInvitation' });
      expect(mocks.db.transaction).not.toHaveBeenCalled();
      expect(mocks.db.insert).not.toHaveBeenCalled();
    }
  );
});

describe('team invitations', () => {
  const invite = { email: 'member@example.com', role: 'member' };

  it('rejects users without a team', async () => {
    mocks.getUserWithTeam.mockResolvedValue({ user, teamId: null });
    expect(await inviteTeamMember({}, form(invite))).toEqual({ error: 'noTeam' });
    expect(mocks.db.select).not.toHaveBeenCalled();
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it('rejects existing members', async () => {
    mocks.limit.mockResolvedValueOnce([{ user }]);
    expect(await inviteTeamMember({}, form(invite))).toEqual({ error: 'alreadyMember' });
    expect(mocks.db.insert).not.toHaveBeenCalled();
    const query = new PgDialect().sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(query.params).toEqual([invite.email, 10]);
  });

  it('rejects an existing pending invitation scoped to the current team', async () => {
    mocks.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 2 }]);
    expect(await inviteTeamMember({}, form(invite))).toEqual({ error: 'invitationExists' });
    expect(mocks.db.insert).not.toHaveBeenCalled();
    const query = new PgDialect().sqlToQuery(mocks.where.mock.calls[1][0]);
    expect(query.params).toEqual([invite.email, 10, 'pending']);
  });

  it('creates an invitation for the current team when no duplicate exists', async () => {
    expect(await inviteTeamMember({}, form(invite))).toEqual({ success: 'invitationSent' });
    expect(mocks.db.insert).toHaveBeenCalledWith(invitations);
    expect(mocks.values).toHaveBeenCalledWith({
      ...invite, teamId: 10, invitedBy: 1, status: 'pending'
    });
  });

  it('rejects a string member id because the current schema requires a number', async () => {
    expect(await removeTeamMember({}, form({ memberId: '2' }))).toEqual({ error: 'invalid' });
    expect(mocks.db.delete).not.toHaveBeenCalled();
  });

  it.todo('accepts a member id submitted by a normal FormData form');
  it.todo('prevents non-owners from inviting or removing team members');
  it.todo('prevents removing a member from another team');
});
