import { NavLink } from 'react-router-dom';
import { LogOut, PenSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';
import { UsageMeter } from '@/components/shared/UsageMeter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/app/editor', label: 'Editor', icon: PenSquare },
];

export function Sidebar() {
  const { profile, user } = useAuth();
  const reset = useAuthStore((s) => s.reset);

  const onLogout = async () => {
    await supabase.auth.signOut();
    reset();
    window.location.assign('/');
  };

  return (
    <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-14 items-center border-b px-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <UsageMeter className="mb-3" />
        <div className="mb-3 px-3 text-xs">
          <p className="truncate font-medium">{profile?.full_name ?? user?.email}</p>
          {profile?.plan && (
            <p className="mt-0.5 uppercase tracking-wide text-muted-foreground">
              {profile.plan} plan
            </p>
          )}
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
