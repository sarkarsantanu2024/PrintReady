import { Card } from '@/components/ui/card';
import { SHEET_SIZES_MM, type Orientation, type SheetSize } from '@/lib/pdf/units';
import type { PrintOptions } from '@/lib/pdf/types';
import type { AnalyzedFile } from '@/lib/upload/types';

interface PreviewSheetProps {
  file: AnalyzedFile | null;
  options: PrintOptions;
}

const PX_PER_MM = 1.4; // display scale

function getSheet(size: SheetSize, orientation: Orientation) {
  const { w, h } = SHEET_SIZES_MM[size];
  return orientation === 'landscape' ? { w: h, h: w } : { w, h };
}

export function PreviewSheet({ file, options }: PreviewSheetProps) {
  const sheet = getSheet(options.pageSize, options.orientation);
  const sheetW = sheet.w * PX_PER_MM;
  const sheetH = sheet.h * PX_PER_MM;

  const grid = options.gridLayout;
  const cardW = grid ? grid.cardWidth : file?.widthMm ?? 0;
  const cardH = grid ? grid.cardHeight : file?.heightMm ?? 0;
  const gap = grid?.gap ?? 5;
  const cols = grid?.cols ?? 1;
  const rows = grid?.rows ?? 1;

  const totalGridW = cols * cardW + (cols - 1) * gap;
  const totalGridH = rows * cardH + (rows - 1) * gap;
  const offsetX = Math.max(0, (sheet.w - totalGridW) / 2);
  const offsetY = Math.max(0, (sheet.h - totalGridH) / 2);

  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Preview
      </h3>
      <div className="flex justify-center overflow-auto">
        <div
          className="relative border bg-white shadow-md"
          style={{ width: sheetW, height: sheetH }}
        >
          {file &&
            cardW > 0 &&
            cardH > 0 &&
            Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => (
                <div
                  key={`${r}-${c}`}
                  className="absolute border border-primary/40 bg-primary/5"
                  style={{
                    left: (offsetX + c * (cardW + gap)) * PX_PER_MM,
                    top: (offsetY + r * (cardH + gap)) * PX_PER_MM,
                    width: cardW * PX_PER_MM,
                    height: cardH * PX_PER_MM,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-primary/70">
                    {file.format.toUpperCase()}
                  </span>
                </div>
              )),
            )}
          {/* Crop mark indicators (corner ticks at sheet edges) */}
          {options.cropMarks && (
            <div className="pointer-events-none absolute inset-0">
              {[
                'left-0 top-0',
                'right-0 top-0',
                'left-0 bottom-0',
                'right-0 bottom-0',
              ].map((cls) => (
                <span
                  key={cls}
                  className={`absolute h-2 w-2 border-slate-400 ${cls} ${cls.includes('left') ? 'border-l' : 'border-r'} ${cls.includes('top') ? 'border-t' : 'border-b'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {options.pageSize} {options.orientation} · {sheet.w}×{sheet.h} mm
      </p>
    </Card>
  );
}
