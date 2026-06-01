import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUsage } from '@/hooks/useUsage';
import { cn } from '@/lib/utils';

interface UsageMeterProps {
  className?: string;
  compact?: boolean;
}

export function UsageMeter({ className, compact }: UsageMeterProps) {
  const { data } = useUsage();
  if (!data) return null;

  const pct = data.limit === 0 ? 0 : Math.min(100, Math.round((data.used / data.limit) * 100));
  const danger = pct >= 100;
  const warn = pct >= 80;

  return (
    <div className={cn('rounded-lg border bg-muted/30 p-3 text-xs', className)}>
      <div className="flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">
          {compact ? 'Usage' : 'Monthly usage'}
        </span>
        <span className="font-mono">
          {data.used} / {data.limit}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            danger ? 'bg-destructive' : warn ? 'bg-amber-500' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {(warn || danger) && data.plan !== 'enterprise' && (
        <Link
          to="/pricing"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <Sparkles className="h-3 w-3" /> Upgrade for more
        </Link>
      )}
    </div>
  );
}
