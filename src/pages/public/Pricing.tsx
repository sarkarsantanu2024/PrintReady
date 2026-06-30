import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PublicShell } from '@/components/layout/AppShell';
import { PricingCard, type TierConfig } from '@/components/pricing/PricingCard';
import { FeatureTable } from '@/components/pricing/FeatureTable';
import { PLANS } from '@/lib/plans';

const tiers: TierConfig[] = [
  {
    id: 'free',
    name: 'Free',
    badgeClass: PLANS.free.badgeClass,
    tagline: PLANS.free.tagline,
    monthly: PLANS.free.monthly,
    yearly: PLANS.free.yearly,
    features: [...PLANS.free.features, 'Print-ready A4 with crop marks'],
    ctaLabel: 'Start free — no login',
    ctaTo: '/',
  },
  {
    id: 'business',
    name: 'Business',
    badgeClass: PLANS.business.badgeClass,
    tagline: PLANS.business.tagline,
    monthly: PLANS.business.monthly,
    yearly: PLANS.business.yearly,
    features: PLANS.business.features,
    highlight: true,
    badge: 'Most popular',
    ctaLabel: 'Choose Business',
    ctaTo: '/create-account',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badgeClass: PLANS.enterprise.badgeClass,
    tagline: PLANS.enterprise.tagline,
    monthly: PLANS.enterprise.monthly,
    yearly: PLANS.enterprise.yearly,
    features: PLANS.enterprise.features,
    ctaLabel: 'Choose Enterprise',
    ctaTo: '/create-account',
  },
  {
    id: 'custom',
    name: 'Customized',
    badgeClass: PLANS.custom.badgeClass,
    tagline: 'Tailored volume, features and pricing for your organisation.',
    monthly: 0,
    yearly: 0,
    priceLabel: 'Custom',
    features: [
      'Choose your own PDFs / month',
      'Price scales with your volume',
      'Generated report',
      'Your own login',
      'Dedicated support',
    ],
    ctaLabel: 'Customize your plan',
    ctaTo: '/create-account',
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: 'How does the quota count?',
    a: 'Each print-ready PDF you generate and download counts as one — no matter how many ID cards are on the sheet. Uploading and previewing PDFs is free; you are only billed when you download the final print-ready PDF.',
  },
  {
    q: 'What file types are supported?',
    a: 'PDF only. Upload the ID-card PDFs exported from your system; other formats (JPG, PNG, DOCX, etc.) are not supported.',
  },
  {
    q: 'Do I need to log in?',
    a: 'Free needs no login. The Business and Enterprise plans require a login (create one on the Create-account page) because they unlock verifiable QR cards and your usage report. Custom plans are set up and managed for you.',
  },
  {
    q: 'When does my monthly quota reset?',
    a: 'On the 1st of every calendar month.',
  },
  {
    q: 'Are my files uploaded to your servers?',
    a: 'No. PDFs are processed entirely in your browser — the photo and details are extracted locally. We never receive the file itself, only the count of PDFs you process.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Plans are month-to-month, no contracts. You keep access through the end of the current billing cycle.',
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <PublicShell>
      <section className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Pricing built for printers
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free with no login. Upgrade when you need more print-ready PDFs per month.
          </p>

          <div className="mt-8 inline-flex rounded-full border bg-card p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                billing === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                billing === 'yearly'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                -16%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <PricingCard key={t.id} tier={t} billing={billing} />
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Compare every feature</h2>
            <p className="mt-3 text-muted-foreground">
              Everything you get on each tier — no hidden gates.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-5xl">
            <FeatureTable />
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold">Frequently asked</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border bg-card p-5 transition open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold">
                  {f.q}
                  <span className="text-2xl font-light text-muted-foreground transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
