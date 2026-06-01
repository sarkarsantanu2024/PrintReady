import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, FileSpreadsheet, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { autoMatchColumns, buildCsvTemplate, parseCsvFile, type ParsedCsv } from '@/lib/csv';
import { triggerDownload, safeFilename } from '@/lib/download';
import { LAYOUTS } from '@/layouts';
import type { LayoutKind } from '@/layouts/types';
import { getFieldsFor } from './fieldConfigs';
import { renderLayoutToBlob } from './generate';
import type { Plan } from '@/lib/supabase';
import { useIncrementUsage } from '@/hooks/useUsage';
import { documentStorage, newDocumentId } from '@/lib/storage/documents';

interface BulkCsvPanelProps {
  layout: LayoutKind;
  plan: Plan;
  userId: string | null;
  onUpgrade: () => void;
}

const planRowLimit: Record<Plan, number> = {
  free: 0,
  starter: 0,
  business: 10,
  pro: 50,
  enterprise: 1000,
};

export function BulkCsvPanel({ layout, plan, userId, onUpgrade }: BulkCsvPanelProps) {
  const incrementUsage = useIncrementUsage();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const def = LAYOUTS[layout];
  const fields = getFieldsFor(layout);
  const templateColumns = fields.map((f) => String(f.name));
  const requiredFields = fields.filter((f) => f.required).map((f) => String(f.name));

  const limit = planRowLimit[plan];
  const isLocked = limit === 0;

  const downloadTemplate = () => {
    const blob = buildCsvTemplate(templateColumns);
    triggerDownload(blob, `${safeFilename(def.meta.label)}-template.csv`);
  };

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      try {
        const result = await parseCsvFile(file);
        setParsed(result);
        const auto = autoMatchColumns(result.columns, templateColumns);
        setMapping(auto);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not parse CSV');
      }
    },
    [templateColumns],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: isLocked,
  });

  if (isLocked) {
    return (
      <Card className="p-6 text-center">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-semibold">Bulk CSV is a Gold &amp; Platinum feature</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CSV and generate up to 50 personalised cards or certificates in one go.
        </p>
        <Button className="mt-5" onClick={onUpgrade}>
          <Sparkles className="mr-2 h-4 w-4" /> Upgrade to unlock
        </Button>
      </Card>
    );
  }

  if (!parsed) {
    return (
      <Card className="p-6">
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted'
          }`}
        >
          <input {...getInputProps()} />
          <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Drop your CSV here, or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Up to {limit} rows for {plan} plan
          </p>
        </div>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" /> Download template CSV
          </Button>
        </div>
      </Card>
    );
  }

  const rowCount = parsed.rows.length;
  const exceedsLimit = rowCount > limit;
  const missingRequired = requiredFields.filter((rf) => !mapping[rf]);

  const generate = async () => {
    if (exceedsLimit) {
      toast.error(`Your ${plan} plan allows ${limit} rows max. Upgrade or trim your CSV.`);
      return;
    }
    if (missingRequired.length > 0) {
      toast.error(`Map required columns: ${missingRequired.join(', ')}`);
      return;
    }

    setGenerating(true);
    try {
      const usage = await incrementUsage(rowCount);
      if (!usage.allowed) {
        toast.error(
          `This bulk job (${rowCount}) exceeds your remaining quota (${usage.limit - usage.used}).`,
        );
        onUpgrade();
        setGenerating(false);
        return;
      }

      const mapped = parsed.rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const field of fields) {
          const fname = String(field.name);
          const csvCol = mapping[fname];
          out[fname] = csvCol ? (row[csvCol] ?? '') : '';
        }
        return out;
      });

      const blob = await renderLayoutToBlob(layout, mapped, def.meta.perA4);
      const filename = `${safeFilename(def.meta.label)}-bulk-${rowCount}.pdf`;
      triggerDownload(blob, filename);

      if (userId) {
        await documentStorage.save({
          id: newDocumentId(),
          user_id: userId,
          flow: 'bulk',
          layout,
          title: `${def.meta.label} bulk · ${rowCount} rows`,
          data: { rowCount, mapping },
          created_at: new Date().toISOString(),
        });
      }

      toast.success(`Generated ${rowCount} ${def.meta.label.toLowerCase()}s`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Map your CSV columns</h3>
            <p className="text-xs text-muted-foreground">
              {rowCount} row{rowCount === 1 ? '' : 's'} detected
              {exceedsLimit && (
                <span className="ml-1 text-destructive">
                  · exceeds {plan} plan limit of {limit}
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setParsed(null)}>
            Re-upload
          </Button>
        </div>

        <div className="mt-4 grid gap-2">
          {fields.map((field) => {
            const fname = String(field.name);
            return (
              <div key={fname} className="grid grid-cols-2 items-center gap-2 text-sm">
                <Label className="font-medium">
                  {field.label}
                  {field.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                <select
                  value={mapping[fname] ?? ''}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [fname]: e.target.value }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">— Skip —</option>
                  {parsed.columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-base font-semibold">Preview (first 3 rows)</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                {fields.map((f) => (
                  <th key={String(f.name)} className="p-2 text-left font-semibold">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-t">
                  {fields.map((f) => {
                    const fname = String(f.name);
                    const col = mapping[fname];
                    return (
                      <td key={fname} className="p-2">
                        {col ? row[col] : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Button
        size="lg"
        className="w-full"
        onClick={generate}
        disabled={generating || exceedsLimit || missingRequired.length > 0}
      >
        {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Generate {rowCount} {def.meta.label.toLowerCase()}
        {rowCount === 1 ? '' : 's'} ({rowCount} of your monthly quota)
      </Button>
    </div>
  );
}
