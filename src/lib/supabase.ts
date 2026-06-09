import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createMockClient } from './mockSupabase';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present.
 * False → the app falls back to a localStorage-backed mock so demos work
 * end-to-end without a Supabase project.
 */
export const isSupabaseConfigured = !!(url && anonKey);

/** True when the exported client is the demo localStorage mock. */
export const isDemoMode = !isSupabaseConfigured;

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : createMockClient();

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.info(
    '[printready] Running in demo mode — auth, profiles, and usage are stored in localStorage. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to switch to real Supabase.',
  );
}

export type Plan = 'free' | 'starter' | 'business' | 'pro' | 'enterprise';

/** Monthly PDF-upload limit per plan. `enterprise` is effectively unlimited. */
export const PLAN_LIMITS: Record<Plan, number> = {
  free: 20,
  starter: 35,
  business: 100,
  pro: 170,
  enterprise: 100000,
};

export interface ProfileRow {
  id: string;
  full_name: string | null;
  plan: Plan;
  created_at: string;
}

export interface UsageInfo {
  used: number;
  limit: number;
  plan: Plan;
}

export interface IncrementResult {
  allowed: boolean;
  used: number;
  limit: number;
  requested: number;
}
