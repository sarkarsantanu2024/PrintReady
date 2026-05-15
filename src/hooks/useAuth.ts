import { useEffect } from 'react';
import { supabase, type ProfileRow } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

/**
 * Bootstraps the auth store from Supabase (or the localStorage mock in demo
 * mode): hydrates initial session, subscribes to auth state changes, and loads
 * the profile row.
 *
 * Mount once at the App root.
 */
export function useAuthBootstrap() {
  const { setSession, setProfile, setInitializing, reset } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle<ProfileRow>();
      if (!mounted) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[auth] profile load failed', error);
        setProfile(null);
        return;
      }
      setProfile(data ?? null);
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        reset();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setInitializing, reset]);
}

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const initializing = useAuthStore((s) => s.initializing);

  return {
    session,
    user,
    profile,
    initializing,
    isAuthenticated: !!session,
  };
}
