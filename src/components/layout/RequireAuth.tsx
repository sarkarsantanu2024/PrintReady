import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/shared/Logo';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { initializing, isAuthenticated } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-shimmer bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <>{children}</>;
}
