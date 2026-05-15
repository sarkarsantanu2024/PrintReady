import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PublicShell } from '@/components/layout/AppShell';
import { PricingCard, type TierConfig } from '@/components/pricing/PricingCard';
import { FeatureTable } from '@/components/pricing/FeatureTable';

const tiers: TierConfig[] = [
  {
    plan: 'silver',
    name: 'Silver',
    tagline: 'For trying things out and personal projects.',
    monthly: 0,
    yearly: 0,
    features: [
      '5 PDF generations per month',
      'All 3 editor layouts',
      'Single file upload up to 10 MB',
      'Up to 8 copies per A4 sheet',
      'Watermarked output',
    ],
    ctaLabel: 'Get started — free',
    ctaTo: '/signup',
  },
  {
    plan: 'gold',
    name: 'Gold',
    tagline: 'For freelancers and small teams shipping prints regularly.',
    monthly: 499,
    yearly: 4990,
    features: [
      '15 PDF generations per month',
      'Multi-file upload up to 25 MB',
      'Bulk CSV mode (up to 10 rows)',
      'Up to 30 copies per sheet',
      'No watermark',
    ],
    highlight: true,
    badge: 'Most popular',
    ctaLabel: 'Choose Gold',
    ctaTo: '/signup',
  },
  {
    plan: 'platinum',
    name: 'Platinum',
    tagline: 'For agencies and print shops handling bulk runs.',
    monthly: 999,
    yearly: 9990,
    features: [
      '20 PDF generations per month',
      'Multi-file batch upload up to 50 MB',
      'Bulk CSV mode (up to 50 rows)',
      'Unlimited copies per sheet',
      'No watermark, priority roadmap',
    ],
    ctaLabel: 'Choose Platinum',
    ctaTo: '/signup',
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: 'How does a "generation" count?',
    a: 'One PDF output = one generation, regardless of flow. 8 ID cards on one A4 sheet via the editor counts as 1. 47 cards via Bulk CSV across 6 sheets counts as 47. One upload-flow conversion counts as 1.',
  },
  {
    q: 'When does my monthly quota reset?',
    a: 'On the 1st of every calendar month, in your account\'s timezone (UTC for the MVP).',
  },
  {
    q: 'Are my designs uploaded to your servers?',
    a: 'No. Files are processed entirely in your browser using WebAssembly + canvas. We never receive the design itself, only metadata about the documents you generate (count, type, timestamp).',
  },
  {
    q: 'Can you do CMYK / Pantone output?',
    a: 'The MVP outputs RGB PDFs at 100% scale, with crop marks and bleed. Most digital and modern offset printers handle this. For strict Pantone matching, send the RGB PDF to your printer for conversion or contact us about CMYK support on the Platinum plan.',
  },
  {
    q: 'What sheet sizes are supported?',
    a: 'A4 (default), A3, A5, US Letter, and US Legal in both portrait and landscape, with multi-up grid layout for cards and tickets.',
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
            Start free. Upgrade when you need more generations, larger files, or bulk CSV.
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

        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <PricingCard key={t.plan} tier={t} billing={billing} />
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
