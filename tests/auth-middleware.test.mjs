import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validatedAction, validatedActionWithUser, withTeam } from '../lib/auth/middleware';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  redirect: vi.fn(),
  getTranslations: vi.fn()
}));
vi.mock('@/lib/db/queries', () => ({
  getUser: mocks.getUser,
  getTeamForUser: mocks.getTeamForUser
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next-intl/server', () => ({ getTranslations: mocks.getTranslations }));

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getTranslations.mockResolvedValue((key, params) =>
    params ? `${key}:${params.count}` : key
  );
  mocks.redirect.mockImplementation((path) => { throw new Error(`redirect:${path}`); });
});

describe('validated actions', () => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(10)
  });

  it.each([
    [{ email: 'bad', password: 'password' }, 'email'],
    [{ email: 'a@example.com', password: 'short' }, 'tooShort:8'],
    [{ email: 'a@example.com', password: 'much-too-long' }, 'tooLong:10'],
    [{ email: 'a@example.com' }, 'invalid']
  ])('does not execute invalid form %#', async (values, error) => {
    const action = vi.fn();
    expect(await validatedAction(schema, action)({}, form(values))).toEqual({ error });
    expect(action).not.toHaveBeenCalled();
  });

  it('passes parsed data and the original form to valid actions', async () => {
    const action = vi.fn().mockResolvedValue('done');
    const data = form({ email: 'a@example.com', password: 'password', extra: 'value' });
    await expect(validatedAction(schema, action)({}, data)).resolves.toBe('done');
    expect(action).toHaveBeenCalledWith(
      { email: 'a@example.com', password: 'password' }, data
    );
  });

  it('rejects unauthenticated users before running the action', async () => {
    mocks.getUser.mockResolvedValue(null);
    const action = vi.fn();
    await expect(validatedActionWithUser(schema, action)({}, form({})))
      .rejects.toThrow('User is not authenticated');
    expect(action).not.toHaveBeenCalled();
  });

  it('validates authenticated forms and passes the user on success', async () => {
    const user = { id: 1 };
    mocks.getUser.mockResolvedValue(user);
    const action = vi.fn().mockResolvedValue('done');
    const wrapped = validatedActionWithUser(schema, action);
    expect(await wrapped({}, form({ email: 'bad', password: 'password' })))
      .toEqual({ error: 'email' });
    expect(action).not.toHaveBeenCalled();
    const data = form({ email: 'a@example.com', password: 'password' });
    await expect(wrapped({}, data)).resolves.toBe('done');
    expect(action).toHaveBeenCalledWith(
      { email: 'a@example.com', password: 'password' }, data, user
    );
  });
});

describe('team gate', () => {
  it('redirects unauthenticated users without looking up a team', async () => {
    mocks.getUser.mockResolvedValue(null);
    const action = vi.fn();
    await expect(withTeam(action)(form({}))).rejects.toThrow('redirect:/sign-in');
    expect(mocks.getTeamForUser).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });

  it('rejects authenticated users without a team', async () => {
    mocks.getUser.mockResolvedValue({ id: 1 });
    mocks.getTeamForUser.mockResolvedValue(null);
    const action = vi.fn();
    await expect(withTeam(action)(form({}))).rejects.toThrow('Team not found');
    expect(action).not.toHaveBeenCalled();
  });

  it('passes the user team and original form to the action', async () => {
    const team = { id: 5 };
    mocks.getUser.mockResolvedValue({ id: 1 });
    mocks.getTeamForUser.mockResolvedValue(team);
    const action = vi.fn().mockResolvedValue('done');
    const data = form({});
    await expect(withTeam(action)(data)).resolves.toBe('done');
    expect(action).toHaveBeenCalledWith(data, team);
  });
});
