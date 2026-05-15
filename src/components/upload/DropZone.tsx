import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload as UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils';

interface DropZoneProps {
  onAccepted: (files: File[]) => void;
  maxSizeBytes: number;
  multiple?: boolean;
  /** Disabled message when plan doesn't allow uploads of this type. */
  disabled?: boolean;
  hint?: string;
}

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/tiff': ['.tif', '.tiff'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
};

export function DropZone({
  onAccepted,
  maxSizeBytes,
  multiple = false,
  disabled = false,
  hint,
}: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const reasons = rejections
          .flatMap((r) => r.errors.map((e) => e.message))
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 2)
          .join(' · ');
        toast.error(`Rejected: ${reasons}`);
      }
      if (accepted.length > 0) onAccepted(accepted);
    },
    [onAccepted],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: maxSizeBytes,
    multiple,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card p-10 text-center transition',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted hover:border-primary/50 hover:bg-muted/30',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input {...getInputProps()} />
      <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-4 text-primary">
        <UploadIcon className="h-7 w-7" />
      </div>
      <p className="text-base font-semibold">
        {isDragActive ? 'Drop to upload' : 'Drop your design here, or click to browse'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        PDF · JPG · PNG · WebP · SVG · TIFF · HEIC — up to {formatBytes(maxSizeBytes, 0)}
      </p>
      {hint && <p className="mt-3 max-w-md text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
