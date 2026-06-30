import { useEffect, useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivatePlanModal } from '@/components/pricing/ActivatePlanModal';
import { useSession, type Session } from '@/lib/clientAuth';
import { PLANS } from '@/lib/plans';
import { getMonthUsage } from '@/lib/usage';
import { useAccountQuota } from '@/lib/accountQuota';

/**
 * Header quota pill.
 *   - Free: built-in monthly allowance vs this month's usage (no payment).
 *   - Paid (Business / Enterprise / Custom): nothing until the account is
 *     activated by redeeming a code → then used/granted. While granted = 0 we
 *     show an "Activate plan" button instead (pay + redeem).
 *   - Super admin: no badge.
 */
export function QuotaBadge() {
  const session = useSession();
  if (!session || session.role === 'superadmin') return null;
  if (session.plan === 'free' || !session.plan) return <FreeBadge account={session.user} />;
  return <PaidBadge session={session} />;
}

function Pill({ used, limit }: { used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = remaining === 0 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-primary';
  return (
    <div
      title="This month's print-ready PDFs for your plan"
      className="flex items-center gap-2 whitespace-nowrap rounded-full border bg-card px-2.5 py-1.5 text-xs shadow-sm sm:gap-2.5 sm:px-3"
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="hidden font-semibold text-foreground sm:inline">
        {used}
        <span className="font-normal text-muted-foreground">/{limit}</span>
      </span>
      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
        <span className={`block h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`font-semibold ${remaining === 0 ? 'text-destructive' : 'text-primary'}`}>
        {remaining} left
      </span>
    </div>
  );
}

function FreeBadge({ account }: { account: string }) {
  const [used, setUsed] = useState(0);
  useEffect(() => {
    let alive = true;
    getMonthUsage(account).then((n) => alive && setUsed(n));
    return () => {
      alive = false;
    };
  }, [account]);
  return <Pill used={used} limit={PLANS.free.pdfs} />;
}

function PaidBadge({ session }: { session: Session }) {
  const quota = useAccountQuota(session.user);
  const [activate, setActivate] = useState(false);

  // Not loaded yet → render nothing to avoid a flash.
  if (!quota) return null;

  return (
    <>
      {quota.granted > 0 ? (
        <button onClick={() => setActivate(true)} title="Tap to top up / extend your plan">
          <Pill used={quota.used} limit={quota.granted} />
        </button>
      ) : (
        <Button size="sm" onClick={() => setActivate(true)}>
          <Sparkles className="mr-1.5 h-4 w-4" /> Activate plan
        </Button>
      )}
      <ActivatePlanModal
        open={activate}
        onOpenChange={setActivate}
        session={session}
        onActivated={() => {
          /* badge re-fetches via bumpAccountQuota() inside the modal flow */
        }}
      />
    </>
  );
}
