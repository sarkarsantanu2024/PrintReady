import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Cell = boolean | string;

interface Row {
  label: string;
  silver: Cell;
  gold: Cell;
  platinum: Cell;
}

const rows: Row[] = [
  { label: 'Generations / month', silver: '5', gold: '15', platinum: '20' },
  { label: 'Editor layouts (ID, Business Card, Certificate)', silver: true, gold: true, platinum: true },
  { label: 'Upload flow', silver: 'Single file', gold: 'Single + multi', platinum: 'Multi-file batch' },
  { label: 'Max upload size', silver: '10 MB', gold: '25 MB', platinum: '50 MB' },
  { label: 'Bulk CSV mode', silver: false, gold: 'Up to 10 rows', platinum: 'Up to 50 rows' },
  { label: 'Max copies per sheet', silver: '8', gold: '30', platinum: 'Unlimited' },
  { label: 'Crop marks, bleed, fold guides', silver: true, gold: true, platinum: true },
  { label: 'Registration marks & color bars', silver: true, gold: true, platinum: true },
  { label: 'Watermark on output', silver: '"Made with PrintReady"', gold: 'None', platinum: 'None' },
  { label: 'Files processed in browser only', silver: true, gold: true, platinum: true },
  { label: 'Works offline (PWA)', silver: true, gold: true, platinum: true },
];

function renderCell(cell: Cell) {
  if (cell === true) return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (cell === false) return <X className="mx-auto h-4 w-4 text-muted-foreground/50" />;
  return <span className="text-sm">{cell}</span>;
}

export function FeatureTable() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-left">
              <th className="p-4 font-semibold">Feature</th>
              <th className="p-4 text-center font-semibold">Silver</th>
              <th className="p-4 text-center font-semibold text-primary">Gold</th>
              <th className="p-4 text-center font-semibold">Platinum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.label} className={cn('border-t', idx % 2 === 1 && 'bg-muted/20')}>
                <td className="p-4 font-medium">{r.label}</td>
                <td className="p-4 text-center">{renderCell(r.silver)}</td>
                <td className="p-4 text-center">{renderCell(r.gold)}</td>
                <td className="p-4 text-center">{renderCell(r.platinum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
