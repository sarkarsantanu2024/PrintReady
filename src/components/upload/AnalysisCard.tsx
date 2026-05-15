import { File, Image as ImageIcon, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { AnalyzedFile } from '@/lib/upload/types';

interface AnalysisCardProps {
  file: AnalyzedFile;
}

export function AnalysisCard({ file }: AnalysisCardProps) {
  const Icon = file.format === 'pdf' ? FileText : file.format === 'svg' ? File : ImageIcon;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{file.file.name}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            {file.format} · {file.orientation}
            {file.pageCount ? ` · ${file.pageCount} page${file.pageCount === 1 ? '' : 's'}` : ''}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Stat label="Width" value={`${file.widthMm.toFixed(1)} mm`} />
        <Stat label="Height" value={`${file.heightMm.toFixed(1)} mm`} />
        {file.pixelWidth > 0 && (
          <>
            <Stat label="Pixels" value={`${file.pixelWidth} × ${file.pixelHeight}`} />
            <Stat label="DPI" value={`${Math.round(file.dpi)}`} />
          </>
        )}
        <Stat label="Color" value={file.colorSpace.toUpperCase()} />
      </dl>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}
