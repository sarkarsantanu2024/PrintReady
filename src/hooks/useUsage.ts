import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, PLAN_LIMITS, type IncrementResult, type UsageInfo } from '@/lib/supabase';
import { useAuth } from './useAuth';

const QUERY_KEY = ['usage'];

/**
 * Reads the user's current month's usage + limit + plan.
 * Works against either real Supabase or the localStorage demo mock.
 */
export function useUsage() {
  const { user, profile } = useAuth();

  return useQuery<UsageInfo>({
    queryKey: [...QUERY_KEY, user?.id ?? 'anon'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_usage', { p_user_id: user!.id });
      if (error) throw error;
      return data as UsageInfo;
    },
    placeholderData: profile
      ? {
          used: 0,
          limit: PLAN_LIMITS[profile.plan] ?? PLAN_LIMITS.free,
          plan: profile.plan,
        }
      : undefined,
  });
}

/**
 * Atomically checks + increments usage. Returns whether the action is allowed.
 * Caller must call this BEFORE generating the PDF — the count is incremented
 * regardless of whether the client subsequently completes generation.
 */
export function useIncrementUsage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return async (count = 1): Promise<IncrementResult> => {
    if (!user) {
      // No session — caller decides what to do.
      return { allowed: false, used: 0, limit: 0, requested: count };
    }
    const { data, error } = await supabase.rpc('increment_usage', {
      p_user_id: user.id,
      p_count: count,
    });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: QUERY_KEY });
    return data as IncrementResult;
  };
}
