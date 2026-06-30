import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setPlan } from '@/lib/accounts';
import { updateSessionPlan, type Session } from '@/lib/clientAuth';
import { bumpAccountQuota } from '@/lib/accountQuota';
import { PLANS, customPrice, type PlanId } from '@/lib/plans';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  /** Called after a successful change (e.g. to open the Activate modal). */
  onChanged: () => void;
}

const SWITCHABLE: PlanId[] = ['business', 'enterprise', 'custom'];

/**
 * Switch plan, or (for Custom) change the monthly PDF volume. Switching resets
 * the activated allowance to 0 — the customer re-activates (pays) for the new
 * plan/volume with a fresh code.
 */
export function ManagePlanModal({ open, onOpenChange, session, onChanged }: Props) {
  const [plan, setPlanId] = useState<PlanId>((session.plan as PlanId) ?? 'business');
  const [pdfs, setPdfs] = useState(session.pdfs ?? 130);
  const [busy, setBusy] = useState(false);

  const price = plan === 'custom' ? customPrice(pdfs) : PLANS[plan].monthly;
  const volume = plan === 'custom' ? pdfs : PLANS[plan].pdfs;

  const save = async () => {
    setBusy(true);
    const res = await setPlan(session.user, plan, plan === 'custom' ? pdfs : undefined, plan === 'custom' ? price : undefined);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.reason ?? 'Could not change the plan.');
      return;
    }
    updateSessionPlan(plan, plan === 'custom' ? price : undefined, plan === 'custom' ? pdfs : undefined);
    bumpAccountQuota();
    toast.success('Plan updated — activate it to switch on the new allowance.');
    onOpenChange(false);
    onChanged();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-xl focus:outline-none">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold">Change plan</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="manage-plan">Plan</Label>
              <select
                id="manage-plan"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={plan}
                onChange={(e) => setPlanId(e.target.value as PlanId)}
              >
                {SWITCHABLE.map((p) => (
                  <option key={p} value={p}>
                    {p === 'custom'
                      ? 'Custom — choose your own volume'
                      : `${PLANS[p].label} — ₹${PLANS[p].monthly}/mo · ${PLANS[p].pdfs} PDFs`}
                  </option>
                ))}
              </select>
            </div>

            {plan === 'custom' && (
              <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <Label htmlFor="manage-pdfs">PDFs per month</Label>
                <Input
                  id="manage-pdfs"
                  type="number"
                  min={10}
                  step={10}
                  value={pdfs}
                  onChange={(e) => setPdfs(Math.max(10, Number(e.target.value) || 0))}
                />
              </div>
            )}

            <p className="rounded-md bg-muted/60 px-3 py-2 text-sm">
              New plan: <span className="font-semibold">{PLANS[plan].label}</span> · {volume} PDFs ·{' '}
              <span className="font-semibold text-primary">₹{price.toLocaleString('en-IN')}</span>/mo
            </p>
            <p className="text-xs text-muted-foreground">
              Changing resets your allowance — you&apos;ll re-activate (pay + code) for the new plan.
            </p>

            <Button className="w-full" size="lg" onClick={save} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save & re-activate
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
