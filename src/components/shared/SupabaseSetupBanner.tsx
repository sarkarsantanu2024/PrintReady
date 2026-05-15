import { FlaskConical } from 'lucide-react';
import { isDemoMode } from '@/lib/supabase';

/**
 * Tiny corner pill indicating demo mode (localStorage-backed mock client).
 * Hidden when Supabase env vars are configured.
 */
export function SupabaseSetupBanner() {
  if (!isDemoMode) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-3 left-3 z-50 flex items-center gap-1.5 rounded-full border bg-card/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur"
      title="Auth, profiles, and usage are stored in your browser. Set Supabase env vars to switch to a real backend."
    >
      <FlaskConical className="h-3 w-3 text-accent" />
      Demo mode
    </div>
  );
}
