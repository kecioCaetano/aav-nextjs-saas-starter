import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), get: vi.fn(), set: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));

const secret = 'test-only-session-signing-secret';
let session;

beforeAll(async () => {
  vi.stubEnv('AUTH_SECRET', secret);
  vi.resetModules();
  session = await import('../lib/auth/session');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue({ get: mocks.get, set: mocks.set });
});

describe('passwords', () => {
  it('hashes a password and verifies correct and incorrect passwords', async () => {
    const password = 'correct-horse-battery';
    const hashed = await session.hashPassword(password);
    expect(hashed).not.toBe(password);
    expect(await session.comparePasswords(password, hashed)).toBe(true);
    expect(await session.comparePasswords('wrong-password', hashed)).toBe(false);
  });
});

describe('session tokens', () => {
  it('signs and verifies the user and expiry', async () => {
    const payload = { user: { id: 42 }, expires: '2099-01-01T00:00:00.000Z' };
    const token = await session.signToken(payload);
    expect(await session.verifyToken(token)).toMatchObject(payload);
  });

  it('rejects a tampered token', async () => {
    const token = await session.signToken({ user: { id: 42 }, expires: '2099-01-01' });
    const [header, payload, signature] = token.split('.');
    const changed = `${header}.${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    await expect(session.verifyToken(changed)).rejects.toThrow();
  });

  it('rejects expired tokens', async () => {
    const token = await new SignJWT({ user: { id: 42 }, expires: '2000-01-01' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1 second ago')
      .sign(new TextEncoder().encode(secret));
    await expect(session.verifyToken(token)).rejects.toThrow();
  });

  it('returns null when no session cookie exists', async () => {
    mocks.get.mockReturnValue(undefined);
    await expect(session.getSession()).resolves.toBeNull();
    expect(mocks.get).toHaveBeenCalledWith('session');
  });

  it('reads and verifies the session cookie', async () => {
    const token = await session.signToken({ user: { id: 7 }, expires: '2099-01-01' });
    mocks.get.mockReturnValue({ value: token });
    await expect(session.getSession()).resolves.toMatchObject({ user: { id: 7 } });
  });

  it('sets an authenticated cookie with a signed user id', async () => {
    await session.setSession({ id: 7 });
    expect(mocks.set).toHaveBeenCalledOnce();
    const [name, token, options] = mocks.set.mock.calls[0];
    expect(name).toBe('session');
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' });
    expect(options.expires.getTime()).toBeGreaterThan(Date.now());
    await expect(session.verifyToken(token)).resolves.toMatchObject({ user: { id: 7 } });
  });
});
