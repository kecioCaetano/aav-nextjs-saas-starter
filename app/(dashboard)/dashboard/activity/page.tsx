import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings,
  LogOut,
  UserPlus,
  Lock,
  UserCog,
  AlertCircle,
  UserMinus,
  Mail,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { ActivityType } from '@/lib/db/schema';
import { getActivityLogs } from '@/lib/db/queries';
import { getLocale, getTranslations } from 'next-intl/server';

const iconMap: Record<ActivityType, LucideIcon> = {
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus,
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle,
};

function getRelativeTime(date: Date, locale: string) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) return formatter.format(0, 'second');
  if (diffInSeconds < 3600)
    return formatter.format(-Math.floor(diffInSeconds / 60), 'minute');
  if (diffInSeconds < 86400)
    return formatter.format(-Math.floor(diffInSeconds / 3600), 'hour');
  if (diffInSeconds < 604800)
    return formatter.format(-Math.floor(diffInSeconds / 86400), 'day');
  return date.toLocaleDateString(locale);
}

export default async function ActivityPage() {
  const logs = await getActivityLogs();
  const t = await getTranslations('Activity');
  const locale = await getLocale();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 dark:text-foreground mb-6">
        {t('title')}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('recent')}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log) => {
                const Icon = iconMap[log.action as ActivityType] || Settings;
                const action = Object.values(ActivityType).find(value => value === log.action);
                const formattedAction = action ? t(`actions.${action}`) : t('unknownAction');

                return (
                  <li key={log.id} className="flex items-center space-x-4">
                    <div className="bg-orange-100 rounded-full p-2">
                      <Icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                        {formattedAction}
                        {log.ipAddress && t('fromIp', { ip: log.ipAddress })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-muted-foreground">
                        {getRelativeTime(new Date(log.timestamp), locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
                {t('empty')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-muted-foreground max-w-sm">
                {t('emptyDescription')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
