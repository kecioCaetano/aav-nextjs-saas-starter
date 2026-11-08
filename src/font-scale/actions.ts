'use server';

import { cookies } from 'next/headers';
import { isFontScale } from './config';

export async function setFontScale(value: string) {
  if (!isFontScale(value)) {
    throw new Error('Unsupported font scale');
  }

  const cookieStore = await cookies();
  cookieStore.set('font-scale', value, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365
  });
}
