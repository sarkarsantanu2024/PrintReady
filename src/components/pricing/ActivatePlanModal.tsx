import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { QRCodeCanvas } from 'qrcode.react';
import { CalendarClock, CheckCircle2, FileText, Loader2, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UPI, upiUri } from '@/lib/payment';
import { downloadInvoice } from '@/lib/billing/invoice';
import { redeemAccountCode, getAccountQuota } from '@/lib/accountQuota';
import { PLANS, type PlanId } from '@/lib/plans';
import type { Session } from '@/lib/clientAuth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  onActivated: () => void;
}

/**
 * Customer pay + activate. They scan the admin UPI QR to pay; the super admin
 * issues a code for their account; they enter it here to switch on the plan.
 */
export function ActivatePlanModal({ open, onOpenChange, session, onActivated }: Props) {
  const plan = (session.plan ?? 'business') as PlanId;
  const amount = session.price ?? PLANS[plan].monthly;
  const qty = session.pdfs ?? PLANS[plan].pdfs;

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // Current allowance for this account (null = still loading).
  const [quota, setQuota] = useState<{ granted: number; used: number; daysLeft: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setDone(false);
    setQuota(null);
    getAccountQuota(session.user).then(
      (q) => alive && setQuota({ granted: q.granted, used: q.used, daysLeft: q.daysLeft }),
    );
    return () => {
      alive = false;
    };
  }, [open, session.user]);

  // Already paid for this month → show status, not the pay QR.
  const active = !done && !!quota && quota.granted > 0;

  const redeem = async () => {
    setBusy(true);
    setError('');
    const res = await redeemAccountCode(session.user, code);
    setBusy(false);
    if (res.ok) {
      setDone(true);
      onActivated();
      toast.success('Plan activated!');
    } else {
      setError(res.reason ?? 'Could not redeem the code.');
    }
  };

  const invoice = () =>
    downloadInvoice({ kind: 'plan', amount, qty, code: code || session.user, buyerName: session.user });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border bg-card p-6 shadow-xl focus:outline-none">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold">
              {done || active ? `${PLANS[plan].label} — active` : `Subscribe — ${PLANS[plan].label}`}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {active ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <CalendarClock className="h-8 w-8 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Your {PLANS[plan].label} plan is active this month.
                  </p>
                  <p className="text-xs text-emerald-700/90 dark:text-emerald-300/80">
                    {quota!.daysLeft} day{quota!.daysLeft === 1 ? '' : 's'} left ·{' '}
                    {quota!.used}/{quota!.granted} PDFs used. Renew when the month ends to continue.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={invoice}>
                <FileText className="mr-1.5 h-4 w-4" /> Download GST invoice
              </Button>
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                {qty} print-ready PDFs / month are now active on{' '}
                <span className="font-medium text-foreground">{session.user}</span>.
              </p>
              <Button variant="outline" className="w-full" onClick={invoice}>
                <FileText className="mr-1.5 h-4 w-4" /> Download GST invoice
              </Button>
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Start generating
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {PLANS[plan].label} · {qty} PDFs / month
                </p>
                <p className="mt-1 text-3xl font-extrabold">₹{amount.toLocaleString('en-IN')}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" /> Scan to pay (PhonePe / any UPI app)
                </p>
                <div className="mx-auto mt-2 w-fit rounded-lg bg-white p-2">
                  <QRCodeCanvas value={upiUri(amount)} size={148} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  UPI: <span className="font-mono">{UPI.vpa}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">After paying, enter the code from your admin</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. SUB-XXXXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={redeem} disabled={busy || !code.trim()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate'}
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <p className="text-xs text-muted-foreground">
                  Your super admin issues this code once your payment is confirmed.
                </p>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
