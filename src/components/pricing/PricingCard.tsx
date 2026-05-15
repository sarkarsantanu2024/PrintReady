import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Plan } from '@/lib/supabase';

export interface TierConfig {
  plan: Plan;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  features: string[];
  highlight?: boolean;
  badge?: string;
  ctaLabel: string;
  ctaTo: string;
}

interface PricingCardProps {
  tier: TierConfig;
  billing: 'monthly' | 'yearly';
}

const planBadgeClass: Record<Plan, string> = {
  silver: 'bg-tier-silver/10 text-slate-600 dark:text-slate-300',
  gold: 'bg-tier-gold/15 text-amber-700 dark:text-amber-300',
  platinum:
    'bg-gradient-to-r from-tier-platinum-from/15 to-tier-platinum-to/15 text-fuchsia-700 dark:text-fuchsia-300',
};

export function PricingCard({ tier, billing }: PricingCardProps) {
  const price = billing === 'monthly' ? tier.monthly : Math.round((tier.yearly / 12) * 100) / 100;
  const subText = billing === 'monthly' ? '/month' : `/month · billed ₹${tier.yearly}/yr`;

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
            planBadgeClass[tier.plan],
          )}
        >
          {tier.name}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{tier.tagline}</p>
      <div className="mt-4">
        <span className="text-4xl font-extrabold">₹{price}</span>
        <span className="ml-1 text-sm text-muted-foreground">{subText}</span>
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
        <Link to={tier.ctaTo}>{tier.ctaLabel}</Link>
      </Button>
    </Card>
  );
}
