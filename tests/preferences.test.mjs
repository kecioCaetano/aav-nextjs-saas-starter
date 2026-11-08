import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOCALE, isLocale, LOCALES } from '../src/i18n/routing';
import { DEFAULT_FONT_SCALE, FONT_SCALES, isFontScale } from '../src/font-scale/config';
import { setLocale } from '../src/i18n/actions';
import { setFontScale } from '../src/font-scale/actions';

const mocks = vi.hoisted(() => ({ set: vi.fn(), cookies: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue({ set: mocks.set });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('locale and font scale validation', () => {
  it('accepts each configured value and rejects unsupported values', () => {
    expect(LOCALES.every(isLocale)).toBe(true);
    expect(FONT_SCALES.every(isFontScale)).toBe(true);
    expect(DEFAULT_LOCALE).toBe('pt');
    expect(DEFAULT_FONT_SCALE).toBe('normal');
    for (const value of ['', 'EN', '../en', 'invalid']) {
      expect(isLocale(value)).toBe(false);
    }
    for (const value of ['', 'Large', '../large', 'invalid']) {
      expect(isFontScale(value)).toBe(false);
    }
  });
});

describe.each([
  ['locale', setLocale, LOCALES],
  ['font-scale', setFontScale, FONT_SCALES]
])('%s cookie', (name, action, values) => {
  it.each(values)('stores %s with secure cookie settings', async (value) => {
    await action(value);
    expect(mocks.set).toHaveBeenCalledExactlyOnceWith(name, value, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365
    });
  });

  it('rejects invalid values before accessing cookies', async () => {
    await expect(action('../invalid')).rejects.toThrow();
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it.each([
    ['production', true],
    ['development', false]
  ])('sets the secure flag appropriately in %s', async (environment, secure) => {
    vi.stubEnv('NODE_ENV', environment);
    await action(values[0]);
    expect(mocks.set).toHaveBeenCalledWith(
      name, values[0], expect.objectContaining({ secure })
    );
  });
});
