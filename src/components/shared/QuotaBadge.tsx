import { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { TopUpModal } from '@/components/pricing/TopUpModal';
import {
  openTopup,
  refreshQuota,
  setTopupOpen,
  useQuota,
  useTopupOpen,
} from '@/lib/quota';

/**
 * Compact monthly-quota pill for the header. Click to open the top-up dialog.
 * Reads from the shared quota store so it stays in sync with the page.
 */
export function QuotaBadge() {
  const usage = useQuota();
  const topupOpen = useTopupOpen();

  useEffect(() => {
    void refreshQuota();
  }, []);

  const pct =
    usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const barColor =
    usage.remaining === 0 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-primary';

  return (
    <>
      <button
        type="button"
        onClick={openTopup}
        title="Monthly print-ready PDF quota — tap to enter a top-up code"
        className="flex items-center gap-2 whitespace-nowrap rounded-full border bg-card px-2.5 py-1.5 text-xs shadow-sm transition hover:border-primary/40 sm:gap-2.5 sm:px-3"
      >
        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="hidden font-semibold text-foreground sm:inline">
          {usage.used}
          <span className="font-normal text-muted-foreground">/{usage.limit}</span>
        </span>
        <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
          <span
            className={`block h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </span>
        <span
          className={`font-semibold ${
            usage.remaining === 0 ? 'text-destructive' : 'text-primary'
          }`}
        >
          {usage.remaining} left
        </span>
      </button>

      <TopUpModal
        open={topupOpen}
        onOpenChange={setTopupOpen}
        usage={usage}
        onRedeemed={() => {
          // Keep the dialog open so it can switch to the GST-invoice step;
          // just refresh the live quota behind it.
          void refreshQuota();
        }}
      />
    </>
  );
}
