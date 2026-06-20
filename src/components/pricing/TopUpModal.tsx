import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Lock, Smartphone, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { QRCodeCanvas } from 'qrcode.react';
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
import { UPI, upiUri } from '@/lib/payment';
import { downloadInvoice } from '@/lib/billing/invoice';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usage: Usage;
  /** Called after a code is successfully redeemed (so the parent can refresh usage). */
  onRedeemed: () => void;
}

type Kind = 'plan' | 'topup';

interface Paid {
  kind: Kind;
  amount: number;
  qty: number;
  code: string;
}

/** A code's prefix tells us what was bought: plan codes are named PDF-… (new)
 * or PLAN-… (older, still valid); top-ups are TOP-…. Anything else falls back
 * to the plan the client selected on the pay screen. */
function inferKind(code: string, fallback: Kind): Kind {
  const u = code.trim().toUpperCase();
  if (u.startsWith('PDF') || u.startsWith('PLAN')) return 'plan';
  if (u.startsWith('TOP')) return 'topup';
  return fallback;
}

/**
 * Add PDFs for the month. The client pays via the PhonePe (UPI) QR, then enters
 * the one-time code we issue once the payment lands. A successful code means the
 * payment is confirmed — at which point the client can download a GST invoice.
 */
export function TopUpModal({ open, onOpenChange, usage, onRedeemed }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Kind>('plan');
  const [paid, setPaid] = useState<Paid | null>(null);
  const [billName, setBillName] = useState('');
  const [billCenter, setBillCenter] = useState('');
  const [billGstin, setBillGstin] = useState('');
  const atLimit = usage.remaining === 0;

  // Reset the flow whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setPaid(null);
      setCode('');
      setSelected('plan');
    }
  }, [open]);

  const amount = selected === 'plan' ? PLAN_PRICE : TOPUP_PRICE;

  const apply = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await redeemTopupCode(code);
      if (res.ok) {
        const kind = inferKind(code, selected);
        setPaid({
          kind,
          amount: kind === 'plan' ? PLAN_PRICE : TOPUP_PRICE,
          qty: kind === 'plan' ? PLAN_GRANT : TOPUP_SIZE,
          code: code.trim().toUpperCase(),
        });
        toast.success('Payment confirmed — your PDFs have been added for this month.');
        setCode('');
        onRedeemed();
      } else {
        toast.error(res.reason ?? 'Could not apply that code.');
      }
    } finally {
      setBusy(false);
    }
  };

  const getInvoice = async () => {
    if (!paid) return;
    try {
      await downloadInvoice({
        kind: paid.kind,
        amount: paid.amount,
        qty: paid.qty,
        code: paid.code,
        buyerName: billName,
        buyerCenter: billCenter,
        buyerGstin: billGstin,
      });
    } catch {
      toast.error('Could not generate the invoice. Please try again.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0">
          {paid ? (
            /* ----------------------- Payment confirmed ----------------------- */
            <>
              <div className="mb-4 inline-flex rounded-full bg-emerald-500/15 p-2.5 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <Dialog.Title className="text-xl font-bold">Payment confirmed</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                {paid.qty} print-ready PDFs were added for this month. You can download your
                GST invoice below.
              </Dialog.Description>

              <div className="mt-4 space-y-2 rounded-xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Bill to (optional)</p>
                <Input value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Name / business" />
                <Input value={billCenter} onChange={(e) => setBillCenter(e.target.value)} placeholder="Center / address" />
                <Input
                  value={billGstin}
                  onChange={(e) => setBillGstin(e.target.value)}
                  placeholder="GSTIN (if registered)"
                  className="font-mono uppercase"
                />
              </div>

              <Button className="mt-4 w-full" onClick={getInvoice}>
                <FileText className="mr-2 h-4 w-4" /> Download GST invoice
              </Button>
              <Button variant="outline" className="mt-2 w-full" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </>
          ) : (
            /* --------------------------- Pay screen -------------------------- */
            <>
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
                You&apos;ve used <strong>{usage.used}</strong> of <strong>{usage.limit}</strong>{' '}
                PDFs this month. Scan to pay with PhonePe, then enter the one-time code you
                receive. Support:{' '}
                <a href="tel:+919804243159" className="font-medium text-foreground hover:text-primary">
                  9804243159
                </a>
                .
              </Dialog.Description>

              {/* Plan selector */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(
                  [
                    { k: 'plan' as Kind, title: 'Monthly plan', price: PLAN_PRICE, qty: PLAN_GRANT },
                    { k: 'topup' as Kind, title: 'Top-up', price: TOPUP_PRICE, qty: TOPUP_SIZE },
                  ]
                ).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setSelected(o.k)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selected === o.k
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:border-primary/40'
                    }`}
                  >
                    <p className="text-sm font-semibold">{o.title}</p>
                    <p className="text-lg font-bold">₹{o.price}</p>
                    <p className="text-xs text-muted-foreground">{o.qty} PDFs</p>
                  </button>
                ))}
              </div>

              {/* PhonePe QR */}
              <div className="mt-4 rounded-xl border bg-white p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 font-semibold text-[#5f259f]">
                  <Smartphone className="h-4 w-4" /> Pay with PhonePe
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Scan &amp; Pay using any UPI app</p>
                <div className="mt-3 inline-flex rounded-lg border bg-white p-2">
                  <QRCodeCanvas value={upiUri(amount)} size={168} level="M" includeMargin={false} />
                </div>
                <p className="mt-2 text-sm font-bold text-foreground">Pay ₹{amount}</p>
                <p className="text-xs text-muted-foreground">
                  {UPI.payeeName} · {UPI.vpa}
                </p>
              </div>

              {/* Code entry */}
              <div className="mt-4 rounded-xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Enter the code you received</p>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PDF-JUNE-2026 or TOP-…"
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
            </>
          )}

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
