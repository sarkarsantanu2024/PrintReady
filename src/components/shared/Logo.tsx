import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

/**
 * Brand logo — an orange rounded badge holding a white ID-card glyph (the
 * app's output), paired with the PrintReady wordmark.
 */
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="PrintReady"
      >
        {/* orange badge */}
        <rect width="40" height="40" rx="11" fill="hsl(var(--primary))" />
        {/* white ID card */}
        <rect x="8.5" y="11" width="23" height="18" rx="2.5" fill="#ffffff" />
        {/* photo */}
        <rect x="11.5" y="14.5" width="6.5" height="7.5" rx="1.2" fill="hsl(var(--primary))" fillOpacity="0.9" />
        {/* detail lines */}
        <rect x="20.5" y="15" width="8" height="2" rx="1" fill="hsl(var(--primary))" fillOpacity="0.75" />
        <rect x="20.5" y="19" width="8" height="1.8" rx="0.9" fill="#cbd5e1" />
        <rect x="11.5" y="24.5" width="17" height="1.8" rx="0.9" fill="#cbd5e1" />
      </svg>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight">
          Print<span className="text-primary">Ready</span>
        </span>
      )}
    </div>
  );
}
