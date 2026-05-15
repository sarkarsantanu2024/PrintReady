import { useEffect, useMemo, useState } from 'react';
import { Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { ZodTypeAny } from 'zod';
import type { DefaultValues } from 'react-hook-form';
import { LAYOUTS } from '@/layouts';
import type { LayoutKind } from '@/layouts/types';
import { FormPanel, type FieldConfig } from './FormPanel';
import { getFieldsFor } from './fieldConfigs';
import { PreviewPanel, toPreview } from './PreviewPanel';
import { renderLayoutToBlob } from './generate';
import { triggerDownload, safeFilename } from '@/lib/download';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useIncrementUsage } from '@/hooks/useUsage';
import { documentStorage, newDocumentId } from '@/lib/storage/documents';

interface SingleEntryPanelProps {
  layout: LayoutKind;
  userId: string | null;
  onUpgradeNeeded?: () => void;
}

export function SingleEntryPanel({ layout, userId, onUpgradeNeeded }: SingleEntryPanelProps) {
  const incrementUsage = useIncrementUsage();
  const def = LAYOUTS[layout];
  const fields = useMemo(() => getFieldsFor(layout), [layout]);

  const [data, setData] = useState<Record<string, unknown>>(def.defaults as Record<string, unknown>);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // Reset form data on layout change
  useEffect(() => {
    setData(def.defaults as Record<string, unknown>);
  }, [def.defaults, layout]);

  const generate = async () => {
    setGenerating(true);
    try {
      // Atomically check + increment usage server-side before doing the work.
      const usage = await incrementUsage(1);
      if (!usage.allowed) {
        toast.error(`Monthly limit reached (${usage.used}/${usage.limit}).`);
        onUpgradeNeeded?.();
        return;
      }

      const blob = await renderLayoutToBlob(layout, [data], def.meta.perA4);
      const filename = `${safeFilename(def.meta.label)}.pdf`;
      triggerDownload(blob, filename);

      if (userId) {
        await documentStorage.save({
          id: newDocumentId(),
          user_id: userId,
          flow: 'editor',
          layout,
          title: deriveTitle(layout, data),
          data,
          created_at: new Date().toISOString(),
        });
      }
      toast.success('PDF generated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // The union of layout schemas defeats inference at this boundary; cast once
  // here. Runtime pairing of schema/defaults/fields is enforced by `LAYOUTS[layout]`.
  type AnyData = Record<string, unknown>;
  const formNode = (
    <FormPanel
      key={layout}
      schema={def.schema as unknown as ZodTypeAny}
      defaults={def.defaults as unknown as DefaultValues<AnyData>}
      fields={fields as unknown as FieldConfig<AnyData>[]}
      onChange={(values) => setData(values as AnyData)}
      resetKey={layout}
    />
  );

  const previewNode = <PreviewPanel preview={toPreview(layout, data)} />;

  if (isDesktop) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5">
          {formNode}
          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={generate}
            disabled={generating}
          >
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate PDF
          </Button>
        </div>
        <div className="col-span-12 lg:col-span-7">{previewNode}</div>
      </div>
    );
  }

  return (
    <div>
      {formNode}

      {/* Floating preview button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-24 right-4 z-30 h-12 w-12 rounded-full shadow-lg"
        aria-label="Preview"
      >
        <Eye className="h-5 w-5" />
      </Button>

      {/* Sticky generate CTA */}
      <div className="safe-bottom fixed inset-x-0 bottom-16 z-20 border-t bg-background/95 p-3 backdrop-blur">
        <Button
          size="lg"
          className="w-full"
          onClick={generate}
          disabled={generating}
        >
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate PDF
        </Button>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="h-[90dvh]">
          <div className="h-full pt-2">{previewNode}</div>
        </SheetContent>
      </Sheet>

      {/* Spacer so form doesn't sit under the sticky CTA */}
      <div className="h-32" />
    </div>
  );
}

function deriveTitle(kind: LayoutKind, data: Record<string, unknown>): string {
  if (kind === 'id_card' || kind === 'business_card') {
    return (data.full_name as string) || `${kind === 'id_card' ? 'ID' : 'Business'} card`;
  }
  return (data.recipient_name as string) || 'Certificate';
}
