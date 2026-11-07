import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export default function ActivityPageSkeleton() {
  const t = useTranslations('Activity');
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 dark:text-foreground mb-6">
        {t('title')}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('recent')}</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[88px]" />
      </Card>
    </section>
  );
}
