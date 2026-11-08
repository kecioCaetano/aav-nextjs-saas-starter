'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { setFontScale } from '@/src/font-scale/actions';
import { isFontScale } from '@/src/font-scale/config';
import { useFontScale } from '@/src/font-scale/provider';

export default function FontScaleSwitcher() {
  const scale = useFontScale();
  const t = useTranslations('FontScale');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function changeScale(value: string) {
    if (!isFontScale(value)) {
      console.error('Unsupported font scale:', value);
      setError(true);
      return;
    }

    setError(false);
    startTransition(async () => {
      try {
        await setFontScale(value);
        router.refresh();
      } catch (error) {
        console.error('Failed to change font size:', error);
        setError(true);
      }
    });
  }

  return (
    <div>
      <select
        aria-label={t('label')}
        value={scale}
        disabled={isPending}
        onChange={(event) => changeScale(event.target.value)}
        className="bg-neutral-100 dark:bg-neutral-800 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="normal">{t('normal')}</option>
        <option value="large">{t('large')}</option>
        <option value="extra-large">{t('extraLarge')}</option>
      </select>
      {error && <p role="alert" className="text-sm text-red-500">{t('error')}</p>}
    </div>
  );
}
