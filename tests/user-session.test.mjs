import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { getUser } from '../lib/db/queries';

const mocks = vi.hoisted(() => {
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return {
    get: vi.fn(),
    cookies: vi.fn(),
    verifyToken: vi.fn(),
    select: vi.fn(() => ({ from })),
    where,
    limit
  };
});

vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('@/lib/auth/session', () => ({ verifyToken: mocks.verifyToken }));
vi.mock('@/lib/db/drizzle', () => ({ db: { select: mocks.select } }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookies.mockResolvedValue({ get: mocks.get });
  mocks.select.mockImplementation(() => ({
    from: () => ({ where: mocks.where })
  }));
  mocks.where.mockImplementation(() => ({ limit: mocks.limit }));
  mocks.get.mockReturnValue({ value: 'signed-token' });
  mocks.verifyToken.mockResolvedValue({
    user: { id: 12 }, expires: '2099-01-01T00:00:00.000Z'
  });
  mocks.limit.mockResolvedValue([{ id: 12 }]);
});

describe('database-backed session lookup', () => {
  it('returns null without a session cookie', async () => {
    mocks.get.mockReturnValue(undefined);
    await expect(getUser()).resolves.toBeNull();
    expect(mocks.verifyToken).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('returns null when the payload expiry has passed', async () => {
    mocks.verifyToken.mockResolvedValue({ user: { id: 12 }, expires: '2000-01-01' });
    await expect(getUser()).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('returns null for an invalid user id', async () => {
    mocks.verifyToken.mockResolvedValue({ user: { id: '12' }, expires: '2099-01-01' });
    await expect(getUser()).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('returns the active user and filters out deleted accounts', async () => {
    await expect(getUser()).resolves.toEqual({ id: 12 });
    const query = new PgDialect().sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(query.params).toEqual([12]);
    expect(query.sql).toContain('"deleted_at" is null');
    expect(mocks.limit).toHaveBeenCalledWith(1);
  });

  it('returns null if the active user no longer exists', async () => {
    mocks.limit.mockResolvedValue([]);
    await expect(getUser()).resolves.toBeNull();
  });

  it('propagates token verification errors', async () => {
    mocks.verifyToken.mockRejectedValue(new Error('invalid token'));
    await expect(getUser()).rejects.toThrow('invalid token');
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
