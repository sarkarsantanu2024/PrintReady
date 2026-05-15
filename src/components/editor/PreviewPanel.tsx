import type { LayoutKind } from '@/layouts/types';
import { IdCardPreview } from '@/layouts/id-card/Preview';
import { BusinessCardPreview } from '@/layouts/business-card/Preview';
import { CertificatePreview } from '@/layouts/certificate/Preview';
import type { IdCardData } from '@/layouts/id-card/schema';
import type { BusinessCardData } from '@/layouts/business-card/schema';
import type { CertificateData } from '@/layouts/certificate/schema';

export type PreviewData =
  | { kind: 'id_card'; data: IdCardData }
  | { kind: 'business_card'; data: BusinessCardData }
  | { kind: 'certificate'; data: CertificateData };

interface PreviewPanelProps {
  preview: PreviewData;
  scale?: number;
}

export function PreviewPanel({ preview, scale }: PreviewPanelProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto rounded-xl border bg-muted/30 p-6">
      {preview.kind === 'id_card' && <IdCardPreview data={preview.data} scale={scale ?? 2} />}
      {preview.kind === 'business_card' && (
        <BusinessCardPreview data={preview.data} scale={scale ?? 2} />
      )}
      {preview.kind === 'certificate' && (
        <CertificatePreview data={preview.data} scale={scale ?? 0.7} />
      )}
    </div>
  );
}

/** Convenience helper to wrap a layout-kind + data into a PreviewData union. */
export function toPreview(kind: LayoutKind, data: unknown): PreviewData {
  if (kind === 'id_card') return { kind, data: data as IdCardData };
  if (kind === 'business_card') return { kind, data: data as BusinessCardData };
  return { kind: 'certificate', data: data as CertificateData };
}
