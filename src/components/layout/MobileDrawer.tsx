import { NavLink } from 'react-router-dom';
import { LogOut, PenSquare, Upload } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Logo } from '@/components/shared/Logo';
import { UsageMeter } from '@/components/shared/UsageMeter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/app/upload', label: 'Upload', icon: Upload },
  { to: '/app/editor', label: 'Editor', icon: PenSquare },
];

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  const { profile, user } = useAuth();
  const reset = useAuthStore((s) => s.reset);

  const onLogout = async () => {
    await supabase.auth.signOut();
    reset();
    onOpenChange(false);
    window.location.assign('/');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <div className="safe-top border-b p-6">
          <Logo />
          <div className="mt-4">
            <p className="truncate text-sm font-medium">
              {profile?.full_name ?? user?.email ?? 'Welcome'}
            </p>
            {profile?.plan && (
              <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                {profile.plan} plan
              </p>
            )}
          </div>
        </div>

        <div className="px-3 pt-3">
          <UsageMeter />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="safe-bottom border-t p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
