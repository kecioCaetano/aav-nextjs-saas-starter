'use server';

import {cookies} from 'next/headers'
import { isLocale } from './routing';

export async function setLocale(locale: string){

    if(!isLocale(locale)){
        throw new Error('Unsupported locale')
    }

    const cookieStore = await cookies();
    cookieStore.set('locale', locale, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV == 'production',
        maxAge: 60 * 60 * 24 * 365
    })
}

