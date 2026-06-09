import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PLAN_GRANT,
  PLAN_PRICE,
  TOPUP_PRICE,
  TOPUP_SIZE,
  redeemTopupCode,
  type Usage,
} from '@/lib/quota';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usage: Usage;
  /** Called after a code is successfully redeemed (so the parent can refresh usage). */
  onRedeemed: () => void;
}

/**
 * Enter a paid code to add PDFs: a monthly plan code (₹3200 → 100) or a top-up
 * code (₹500 → 30). Strict monthly — the month starts at 0 until a plan code is
 * redeemed.
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
        toast.success('Code applied — your PDFs have been added for this month.');
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
            {atLimit ? 'Add PDFs for this month' : 'Top up your monthly PDFs'}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            You&apos;ve used <strong>{usage.used}</strong> of{' '}
            <strong>{usage.limit}</strong> PDFs this month. Pay, then enter the
            one-time code you receive to add more. Support:{' '}
            <a href="tel:+919804243159" className="font-medium text-foreground hover:text-primary">
              9804243159
            </a>
            .
          </Dialog.Description>

          <ul className="mt-4 space-y-1.5 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong>Monthly plan — ₹{PLAN_PRICE}</strong> → {PLAN_GRANT} print-ready PDFs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong>Top-up — ₹{TOPUP_PRICE}</strong> → {TOPUP_SIZE} more print-ready PDFs.
              </span>
            </li>
          </ul>

          <div className="mt-4 rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold">Enter your code</p>
            <div className="mt-2 flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PLAN-… or TOP-…"
                className="min-w-0 font-mono uppercase"
                onKeyDown={(e) => e.key === 'Enter' && apply()}
              />
              <Button onClick={apply} disabled={!code.trim() || busy}>
                {busy ? 'Applying…' : 'Apply'}
              </Button>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Each code can be used once. Need unlimited? Ask about the{' '}
            <strong>Enterprise — ₹4500/mo</strong> plan.
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
