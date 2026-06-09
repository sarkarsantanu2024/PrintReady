import { FileText, Upload, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

interface Props {
  files: File[];
  onRemove: (index: number) => void;
  onClear: () => void;
  onUpload: () => void;
}

/**
 * Popup that lists the staged PDFs so the page doesn't grow with a long inline
 * list. Opens automatically while files are staged; closing it cancels them.
 */
export function PendingFilesModal({ files, onRemove, onClear, onUpload }: Props) {
  const open = files.length > 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClear();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <Dialog.Title className="text-lg font-bold">
            {files.length} PDF{files.length === 1 ? '' : 's'} ready to upload
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Review your files, then upload to extract the photos and details.
          </Dialog.Description>

          <ul className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${f.size}-${i}`}
                className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="text-muted-foreground transition hover:text-destructive"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear all
            </Button>
            <Button size="lg" onClick={onUpload}>
              <Upload className="mr-2 h-4 w-4" />
              Upload {files.length} PDF{files.length === 1 ? '' : 's'}
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
