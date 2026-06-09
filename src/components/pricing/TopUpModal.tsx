import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BASE_LIMIT, TOPUP_PRICE, TOPUP_SIZE, redeemTopupCode, type Usage } from '@/lib/quota';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usage: Usage;
  /** Called after a code is successfully redeemed (so the parent can refresh usage). */
  onRedeemed: () => void;
}

/**
 * Shown when the client hits their monthly PDF limit. Offers a ₹500 top-up
 * (+30 PDFs) redeemed via a one-time code, or upgrading to Enterprise.
 */
export function TopUpModal({ open, onOpenChange, usage, onRedeemed }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const atLimit = usage.remaining === 0;

  const apply = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await redeemTopupCode(code);
      if (res.ok) {
        toast.success(`Top-up applied — ${TOPUP_SIZE} more PDFs unlocked this month.`);
        setCode('');
        onRedeemed();
      } else {
        toast.error(res.reason ?? 'Could not apply that code.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <div
            className={`mb-4 inline-flex rounded-full p-2.5 ${
              atLimit ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'
            }`}
          >
            <Lock className="h-5 w-5" />
          </div>
          <Dialog.Title className="text-xl font-bold">
            {atLimit ? 'Monthly PDF limit reached' : 'Top up your monthly PDFs'}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            You&apos;ve used <strong>{usage.used}</strong> of your{' '}
            <strong>{usage.limit}</strong> PDFs this month
            {usage.topups > 0 && ` (includes ${usage.topups} top-up${usage.topups === 1 ? '' : 's'})`}.
            {atLimit
              ? ' Buy a top-up to keep generating, or upgrade your plan.'
              : ' Paid for a top-up? Enter your code below to add more.'}
          </Dialog.Description>

          <div className="mt-5 rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold">
              Top-up — ₹{TOPUP_PRICE} for {TOPUP_SIZE} more print-ready PDFs
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pay ₹{TOPUP_PRICE} (support:{' '}
              <a href="tel:+919804243159" className="font-medium text-foreground hover:text-primary">
                9804243159
              </a>
              ), then enter the one-time code you receive below. Each code adds {TOPUP_SIZE}{' '}
              print-ready PDFs and can be used once.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="TOP-XXXX-XXXX"
                className="font-mono uppercase"
                onKeyDown={(e) => e.key === 'Enter' && apply()}
              />
              <Button onClick={apply} disabled={!code.trim() || busy}>
                {busy ? 'Applying…' : 'Apply'}
              </Button>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Need more every month? Upgrade to <strong>Enterprise — ₹4500/mo</strong> for unlimited
            print-ready PDFs. Base plan covers {BASE_LIMIT} print-ready PDFs/month.
          </p>

          <div className="mt-5">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>

          <Dialog.Close
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
