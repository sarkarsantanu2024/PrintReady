import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        className="h-8 w-8 text-primary"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="3" y="6" width="26" height="20" rx="3" fill="currentColor" opacity="0.15" />
        <rect x="3" y="6" width="26" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8 14h12M8 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="23" cy="22" r="3" fill="hsl(var(--accent))" />
      </svg>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight">
          Print<span className="text-primary">Ready</span>
        </span>
      )}
    </div>
  );
}
