import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, PenSquare, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const items = [
  { to: '/app/upload', label: 'Upload', icon: Upload },
  { to: '/app/editor', label: 'Editor', icon: PenSquare },
];

export function BottomNav() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const reset = useAuthStore((s) => s.reset);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (Math.abs(dy) > 8) {
        setHidden(dy > 0 && y > 80);
        lastY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onLogout = async () => {
    await supabase.auth.signOut();
    reset();
    window.location.assign('/');
  };

  return (
    <nav
      className={cn(
        'safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur transition-transform duration-200 lg:hidden',
        hidden ? 'translate-y-full' : 'translate-y-0',
      )}
    >
      <div className="grid grid-cols-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" />
                <span>{label}</span>
                {isActive && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
                )}
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
