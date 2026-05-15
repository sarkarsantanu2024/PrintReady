import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { QualityNote, WarningLevel } from '@/lib/upload/quality-check';

const ICONS: Record<WarningLevel, React.ComponentType<{ className?: string }>> = {
  good: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  caution: AlertCircle,
};

const COLORS: Record<WarningLevel, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  info: 'text-sky-600 dark:text-sky-400',
  warning: 'text-amber-600 dark:text-amber-400',
  caution: 'text-rose-600 dark:text-rose-400',
};

export function QualityWarnings({ notes }: { notes: QualityNote[] }) {
  if (notes.length === 0) return null;
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Quality check
      </h3>
      <ul className="space-y-2">
        {notes.map((n, i) => {
          const Icon = ICONS[n.level];
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', COLORS[n.level])} />
              <span>{n.message}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
