import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLoginOpen, setLoginOpen } from '@/lib/clientAuth';
import { AuthPanel } from './AuthPanel';

/** Login / Create-account / Reset shown in a compact modal (no blank page). */
export function AuthModal() {
  const open = useLoginOpen();
  return (
    <Dialog.Root open={open} onOpenChange={setLoginOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border bg-card p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="sr-only">Sign in</Dialog.Title>
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="absolute right-3 top-3"
            >
              <X className="h-4 w-4" />
            </Button>
          </Dialog.Close>
          <AuthPanel onDone={() => setLoginOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
