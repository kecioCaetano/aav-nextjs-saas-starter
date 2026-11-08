import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('NotFound');
  return (
    <div className="flex items-center justify-center min-h-[100dvh]">
      <div className="max-w-md space-y-8 p-4 text-center">
        <div className="flex justify-center">
          <Image src="/images/proller-icon.svg" alt="Proller" width={48} height={48} />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-foreground tracking-tight">
          {t('title')}
        </h1>
        <p className="text-base text-gray-500 dark:text-muted-foreground">
          {t('description')}
        </p>
        <Link
          href="/"
          className="max-w-48 mx-auto flex justify-center py-2 px-4 border border-gray-300 dark:border-border rounded-full shadow-sm text-sm font-medium text-gray-700 dark:text-foreground bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          {t('back')}
        </Link>
      </div>
    </div>
  );
}
