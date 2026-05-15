import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col bg-muted/30">
      <div className="container flex flex-1 flex-col items-center justify-center py-10">
        <Link to="/" className="mb-8">
          <Logo />
        </Link>
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
