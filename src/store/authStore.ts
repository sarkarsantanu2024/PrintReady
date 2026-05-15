import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Plan, ProfileRow } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  /** True until the initial getSession() resolves. Use to gate route guards. */
  initializing: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: ProfileRow | null) => void;
  setPlan: (plan: Plan) => void;
  setInitializing: (initializing: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  initializing: true,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setProfile: (profile) => set({ profile }),
  setPlan: (plan) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, plan } : state.profile,
    })),
  setInitializing: (initializing) => set({ initializing }),
  reset: () => set({ session: null, user: null, profile: null }),
}));
