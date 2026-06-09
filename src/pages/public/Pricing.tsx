import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PublicShell } from '@/components/layout/AppShell';
import { PricingCard, type TierConfig } from '@/components/pricing/PricingCard';
import { FeatureTable } from '@/components/pricing/FeatureTable';

const tiers: TierConfig[] = [
  {
    id: 'free',
    name: 'Free',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    tagline: 'Try it out — no account needed.',
    monthly: 0,
    yearly: 0,
    features: [
      '20 PDF uploads per month',
      'No login required',
      'Auto-extract photo + details from each PDF',
      'Print-ready A4 with crop marks',
      'PDF files only',
    ],
    ctaLabel: 'Start free — no login',
    ctaTo: '/',
  },
  {
    id: 'starter',
    name: 'Starter',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    tagline: 'For a single center getting started.',
    monthly: 699,
    yearly: 6990,
    features: [
      '35 PDF uploads per month',
      'Login not required',
      'Everything in Free',
      'No watermark on output',
    ],
    ctaLabel: 'Choose Starter',
    ctaTo: '/signup',
  },
  {
    id: 'business',
    name: 'Business',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    tagline: 'For busy centers with regular batches.',
    monthly: 1499,
    yearly: 14990,
    features: [
      '150 PDF uploads per month',
      'Login not required',
      'Priority support',
    ],
    highlight: true,
    badge: 'Most popular',
    ctaLabel: 'Choose Business',
    ctaTo: '/signup',
  },
  {
    id: 'pro',
    name: 'Pro',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    tagline: 'For multi-center brands and franchises.',
    monthly: 2499,
    yearly: 24990,
    features: [
      '170 PDF uploads per month',
      'Login not required',
      'Multiple team members',
      'Multi-center branding',
    ],
    ctaLabel: 'Choose Pro',
    ctaTo: '/signup',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badgeClass: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
    tagline: 'Unlimited volume with a saved student database.',
    monthly: 3000,
    yearly: 30000,
    features: [
      'Unlimited PDF uploads',
      'Login not required',
      'Saved student database',
      'Dedicated support',
    ],
    ctaLabel: 'Choose Enterprise',
    ctaTo: '/signup',
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: 'How does a PDF upload count?',
    a: 'Each source PDF you upload and process counts as one against your monthly quota — regardless of how many cards it produces. Your plan limit is simply the number of PDFs you can process per month.',
  },
  {
    q: 'What file types are supported?',
    a: 'PDF only. Upload the ID-card PDFs exported from your system; other formats (JPG, PNG, DOCX, etc.) are not supported.',
  },
  {
    q: 'Do I need to log in?',
    a: 'No login is required. Just upload your ID-card PDFs and generate your print-ready sheet — everything runs in your browser.',
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
            Start free with no login. Upgrade when you need more PDF uploads per month.
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

        <div className="mx-auto mt-10 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
