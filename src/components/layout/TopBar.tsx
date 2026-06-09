import { Link } from 'react-router-dom';
import { LogOut, Menu, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/shared/Logo';
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

  const onLogout = async () => {
    await supabase.auth.signOut();
    reset();
    window.location.assign('/');
  };

  return (
    <header className="safe-top sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
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

        {variant === 'public' && (
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
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
