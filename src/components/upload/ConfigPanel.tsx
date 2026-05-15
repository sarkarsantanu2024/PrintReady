import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type {
  Bleed,
  CropMarkStyle,
  FoldMarkStyle,
  PrintOptions,
} from '@/lib/pdf/types';
import type { Plan } from '@/lib/supabase';

interface ConfigPanelProps {
  options: PrintOptions;
  onChange: (next: PrintOptions) => void;
  plan: Plan;
  /** When provided, shows a "Best fit" button that recomputes the densest grid. */
  onBestFit?: () => void;
}

const planMaxCopies: Record<Plan, number | null> = {
  silver: 8,
  gold: 30,
  platinum: null,
};

export function ConfigPanel({ options, onChange, plan, onBestFit }: ConfigPanelProps) {
  const set = <K extends keyof PrintOptions>(k: K, v: PrintOptions[K]) =>
    onChange({ ...options, [k]: v });

  const grid = options.gridLayout;
  const setGrid = (patch: Partial<NonNullable<PrintOptions['gridLayout']>>) => {
    if (!grid) return;
    onChange({ ...options, gridLayout: { ...grid, ...patch } });
  };

  const cap = planMaxCopies[plan];
  const totalCopies = grid ? grid.cols * grid.rows : 1;
  const overCap = cap !== null && totalCopies > cap;

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Configuration
        </h3>
        {onBestFit && (
          <Button type="button" variant="outline" size="sm" onClick={onBestFit}>
            <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Best fit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5 block text-xs">Sheet size</Label>
          <select
            value={options.pageSize}
            onChange={(e) => set('pageSize', e.target.value as PrintOptions['pageSize'])}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {(['A4', 'A3', 'A5', 'Letter', 'Legal'] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Orientation</Label>
          <select
            value={options.orientation}
            onChange={(e) => set('orientation', e.target.value as PrintOptions['orientation'])}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Bleed (mm)</Label>
          <select
            value={options.bleed ?? 3}
            onChange={(e) => set('bleed', Number(e.target.value) as Bleed)}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value={0}>0 — none</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Crop mark style</Label>
          <select
            value={options.cropMarkStyle ?? 'corner'}
            onChange={(e) => set('cropMarkStyle', e.target.value as CropMarkStyle)}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="corner">Corner ticks</option>
            <option value="full-bleed">Full-bleed</option>
            <option value="japanese">Japanese</option>
          </select>
        </div>

        <div className="col-span-2">
          <Label className="mb-1.5 block text-xs">Fold guides</Label>
          <select
            value={options.foldMarks ?? 'none'}
            onChange={(e) => set('foldMarks', e.target.value as FoldMarkStyle)}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="none">None</option>
            <option value="bi">Bi-fold</option>
            <option value="tri">Tri-fold</option>
            <option value="name-tent">Name tent</option>
          </select>
        </div>
      </div>

      {grid ? (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide">Grid layout</Label>
            <span
              className={`font-mono text-xs ${overCap ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {totalCopies} per sheet{cap !== null ? ` · ${plan} cap ${cap}` : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Columns"
              value={grid.cols}
              min={1}
              onChange={(v) => setGrid({ cols: v })}
            />
            <NumberField
              label="Rows"
              value={grid.rows}
              min={1}
              onChange={(v) => setGrid({ rows: v })}
            />
            <NumberField
              label="Card width (mm)"
              value={Math.round(grid.cardWidth * 10) / 10}
              min={1}
              step={0.1}
              onChange={(v) => setGrid({ cardWidth: v })}
            />
            <NumberField
              label="Card height (mm)"
              value={Math.round(grid.cardHeight * 10) / 10}
              min={1}
              step={0.1}
              onChange={(v) => setGrid({ cardHeight: v })}
            />
            <NumberField
              label="Gap between cards (mm)"
              value={grid.gap}
              min={0}
              step={1}
              onChange={(v) => setGrid({ gap: v })}
              className="col-span-2"
            />
          </div>

          <button
            type="button"
            className="w-full text-left text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange({ ...options, gridLayout: undefined })}
          >
            ← Switch to single-piece centered
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
          Single piece centered on the sheet. Click <strong>Best fit</strong> above to lay out
          multiple copies in a grid with crop marks.
        </div>
      )}

      <div className="space-y-2 border-t pt-3 text-sm">
        <Toggle
          label="Crop marks"
          checked={!!options.cropMarks}
          onChange={(v) => set('cropMarks', v)}
        />
        <Toggle
          label="Registration marks (commercial press alignment)"
          checked={!!options.registrationMarks}
          onChange={(v) => set('registrationMarks', v)}
        />
        <Toggle
          label="Color bars (press calibration strip)"
          checked={!!options.colorBars}
          onChange={(v) => set('colorBars', v)}
        />
      </div>
    </Card>
  );
}

function NumberField({
  label,
  value,
  min = 0,
  step = 1,
  onChange,
  className,
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-[10px]">{label}</Label>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.max(min, n));
        }}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded text-primary"
      />
    </label>
  );
}
