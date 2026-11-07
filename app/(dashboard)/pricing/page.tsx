import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';
import { getTranslations } from 'next-intl/server';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const t = await getTranslations('Pricing');
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const basePlan = products.find((product) => product.name === 'Base');
  const plusPlan = products.find((product) => product.name === 'Plus');

  const basePrice = prices.find((price) => price.productId === basePlan?.id);
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
        <PricingCard
          name={basePlan?.name || 'Base'}
          price={basePrice?.unitAmount || 800}
          interval={basePrice?.interval || 'month'}
          trialDays={basePrice?.trialPeriodDays || 7}
          features={[
            t('unlimitedUsage'),
            t('unlimitedMembers'),
            t('emailSupport'),
          ]}
          priceId={basePrice?.id}
        />
        <PricingCard
          name={plusPlan?.name || 'Plus'}
          price={plusPrice?.unitAmount || 1200}
          interval={plusPrice?.interval || 'month'}
          trialDays={plusPrice?.trialPeriodDays || 7}
          features={[
            t('baseFeatures'),
            t('earlyAccess'),
            t('slackSupport'),
          ]}
          priceId={plusPrice?.id}
        />
      </div>
    </main>
  );
}

async function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
}) {
  const t = await getTranslations('Pricing');
  const translatedInterval =
    interval === 'day' ? t('day') :
    interval === 'week' ? t('week') :
    interval === 'month' ? t('month') :
    interval === 'year' ? t('year') : interval;
  return (
    <div className="pt-6">
      <h2 className="text-2xl font-medium text-gray-900 dark:text-foreground mb-2">{name}</h2>
      <p className="text-sm text-gray-600 dark:text-muted-foreground mb-4">
        {t('trial', { count: trialDays })}
      </p>
      <p className="text-4xl font-medium text-gray-900 dark:text-foreground mb-6">
        ${price / 100}{' '}
        <span className="text-xl font-normal text-gray-600 dark:text-muted-foreground">
          {t('perUser', { interval: translatedInterval })}
        </span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton />
      </form>
    </div>
  );
}
