import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface TierConfig {
  /** Display-only identifier for React keys — decoupled from the auth Plan enum. */
  id: string;
  name: string;
  /** Tailwind classes for the small name badge. */
  badgeClass: string;
  tagline: string;
  monthly: number;
  yearly: number;
  features: string[];
  highlight?: boolean;
  badge?: string;
  ctaLabel: string;
  ctaTo: string;
  /** When set, shown verbatim instead of the numeric ₹price (e.g. "Custom"). */
  priceLabel?: string;
  /** When set, the CTA is an external link (e.g. mailto:) instead of a route. */
  ctaHref?: string;
}

interface PricingCardProps {
  tier: TierConfig;
  billing: 'monthly' | 'yearly';
}

export function PricingCard({ tier, billing }: PricingCardProps) {
  const price = billing === 'monthly' ? tier.monthly : Math.round((tier.yearly / 12) * 100) / 100;
  const subText =
    tier.monthly === 0
      ? 'forever'
      : billing === 'monthly'
        ? '/month'
        : `/month · billed ₹${tier.yearly}/yr`;

  return (
    <Card
      className={cn(
        'relative flex flex-col p-6',
        tier.highlight && 'border-primary ring-2 ring-primary/30',
      )}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          {tier.badge}
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
            tier.badgeClass,
          )}
        >
          {tier.name}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{tier.tagline}</p>
      <div className="mt-4">
        {tier.priceLabel ? (
          <span className="text-4xl font-extrabold">{tier.priceLabel}</span>
        ) : (
          <>
            <span className="text-4xl font-extrabold">₹{price}</span>
            <span className="ml-1 text-sm text-muted-foreground">{subText}</span>
          </>
        )}
      </div>

      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="mt-6" variant={tier.highlight ? 'default' : 'outline'} size="lg">
        {tier.ctaHref ? (
          <a href={tier.ctaHref}>{tier.ctaLabel}</a>
        ) : (
          <Link to={tier.ctaTo}>{tier.ctaLabel}</Link>
        )}
      </Button>
    </Card>
  );
}
