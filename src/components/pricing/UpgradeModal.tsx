import { Sparkles, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  /** What feature/quota the user just hit. */
  context: string;
}

export function UpgradeModal({ open, onOpenChange, reason, context }: UpgradeModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="mb-4 inline-flex rounded-full bg-accent/15 p-2.5 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <Dialog.Title className="text-xl font-bold">{context}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {reason}
          </Dialog.Description>

          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong>Starter — ₹699/mo</strong> · 35 PDF uploads per month.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong>Business — ₹1499/mo</strong> · 70 PDF uploads, bulk CSV.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong>Pro — ₹2499/mo</strong> · 170 PDF uploads, multiple users.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong>Enterprise — ₹3000/mo</strong> · Unlimited uploads + student database.
              </span>
            </li>
          </ul>

          <div className="mt-6 flex gap-2">
            <Button asChild className="flex-1" size="lg">
              <Link to="/pricing">See plans</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Maybe later
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
