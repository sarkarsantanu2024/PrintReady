import { AlertTriangle, FileWarning, HardDrive, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

export type AdvisoryReason = 'oversize' | 'irregular' | 'failed';

export interface UploadAdvisory {
  filename: string;
  sizeMB: number;
  reasons: AdvisoryReason[];
}

interface Props {
  advisories: UploadAdvisory[];
  onClose: () => void;
}

const REASON_META: Record<AdvisoryReason, { label: string; icon: typeof HardDrive }> = {
  oversize: { label: 'Large file (over 3 MB)', icon: HardDrive },
  irregular: { label: 'Non-standard / print-style PDF', icon: FileWarning },
  failed: { label: 'Could not be read', icon: AlertTriangle },
};

/**
 * Non-blocking advisory shown after processing when one or more uploaded PDFs
 * were heavy (>3 MB) or in an irregular "Save as PDF"/scanned format. The files
 * are still processed — this just nudges the client to upload cleaner, smaller
 * ID-card PDFs next time for the sharpest results.
 */
export function UploadAdvisoryModal({ advisories, onClose }: Props) {
  const open = advisories.length > 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <div className="mb-4 inline-flex rounded-full bg-amber-500/15 p-2.5 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <Dialog.Title className="text-xl font-bold">A note for next time</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            We processed your upload, but {advisories.length === 1 ? 'one file was' : 'some files were'}{' '}
            heavy or in a non-standard format. For the sharpest photos and fastest results,
            upload the original ID-card PDF (a clean export, ideally under <strong>3&nbsp;MB</strong>).
          </Dialog.Description>

          <ul className="mt-4 space-y-2">
            {advisories.map((a, i) => (
              <li key={`${a.filename}-${i}`} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.filename}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.sizeMB >= 0.01 ? `${a.sizeMB.toFixed(a.sizeMB >= 1 ? 1 : 2)} MB` : ''}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {a.reasons.map((r) => {
                    const meta = REASON_META[r];
                    const Icon = meta.icon;
                    return (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                      >
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>

          <Button className="mt-5 w-full" onClick={onClose}>
            Got it — continue
          </Button>

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
