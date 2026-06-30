import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, LogIn, LogOut, Menu, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useIsLoggedIn,
  useSession,
  logout as clientLogout,
  openLogin,
} from '@/lib/clientAuth';
import { planHasReport } from '@/lib/plans';
import { ReportModal } from '@/components/report/ReportModal';
import { AuthModal } from '@/components/auth/AuthModal';
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
  const navigate = useNavigate();
  const session = useSession();
  const [reportOpen, setReportOpen] = useState(false);
  const canSeeReport =
    variant === 'public' && session != null && planHasReport(session.plan, session.role);

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

        {variant === 'public' && clientAuthed && (
          <div className="shrink-0">
            <QuotaBadge />
          </div>
        )}

        <div className="flex flex-1 items-center justify-end gap-2">
          {canSeeReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportOpen(true)}
              title="View your usage & spend report"
            >
              <BarChart3 className="mr-1.5 h-4 w-4" /> Report
            </Button>
          )}
          {variant === 'public' &&
            (clientAuthed && session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserIcon className="mr-1.5 h-4 w-4" />
                    <span className="max-w-[8rem] truncate">{session.user}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="truncate text-sm font-medium">{session.user}</span>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {session.role === 'superadmin'
                          ? 'Super admin'
                          : `${session.plan ?? 'free'} plan`}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <UserIcon className="mr-2 h-4 w-4" /> My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      clientLogout();
                      navigate('/');
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : variant === 'public' ? (
              <Button variant="outline" size="sm" onClick={openLogin}>
                <LogIn className="mr-1.5 h-4 w-4" /> Log in
              </Button>
            ) : null)}

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

      {canSeeReport && session && (
        <ReportModal open={reportOpen} onOpenChange={setReportOpen} session={session} />
      )}
      {variant === 'public' && <AuthModal />}
    </header>
  );
}
