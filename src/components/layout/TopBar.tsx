import { Link } from 'react-router-dom';
import { LogIn, LogOut, Menu, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsLoggedIn, logout as clientLogout } from '@/lib/clientAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/shared/Logo';
import { QuotaBadge } from '@/components/shared/QuotaBadge';
import { QUOTA_ENABLED } from '@/lib/quota';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface TopBarProps {
  variant?: 'public' | 'app';
  onOpenDrawer?: () => void;
}

export function TopBar({ variant = 'public', onOpenDrawer }: TopBarProps) {
  const { user, profile, isAuthenticated } = useAuth();
  const reset = useAuthStore((s) => s.reset);
  const clientAuthed = useIsLoggedIn();

  const onLogout = async () => {
    await supabase.auth.signOut();
    reset();
    window.location.assign('/');
  };

  return (
    <header className="safe-top sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur">
      <div className="container flex h-14 items-center gap-2">
        <div className="flex flex-1 items-center gap-2">
          {variant === 'app' && onOpenDrawer && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onOpenDrawer}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link to={isAuthenticated ? '/app/upload' : '/'} className="flex items-center">
            <Logo />
          </Link>
        </div>

        {variant === 'public' && clientAuthed && QUOTA_ENABLED && (
          <div className="shrink-0">
            <QuotaBadge />
          </div>
        )}

        <div className="flex flex-1 items-center justify-end gap-2">
          {variant === 'public' &&
            (clientAuthed ? (
              <Button variant="outline" size="sm" onClick={() => clientLogout()}>
                <LogOut className="mr-1.5 h-4 w-4" /> Log out
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <LogIn className="mr-1.5 h-4 w-4" /> Log in
              </Button>
            ))}

          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {profile?.full_name ?? user?.email ?? 'Account'}
                    </span>
                    {profile?.plan && (
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {profile.plan} plan
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
