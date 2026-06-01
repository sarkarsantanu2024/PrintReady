import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Cell = boolean | string;

interface Row {
  label: string;
  free: Cell;
  starter: Cell;
  business: Cell;
  pro: Cell;
  enterprise: Cell;
}

const rows: Row[] = [
  { label: 'PDF uploads / month', free: '20', starter: '35', business: '70', pro: '170', enterprise: 'Unlimited' },
  { label: 'Login required', free: false, starter: true, business: true, pro: true, enterprise: true },
  { label: 'Monthly price', free: '₹0', starter: '₹699', business: '₹1499', pro: '₹2499', enterprise: '₹3000' },
  { label: 'Auto-extract photo + details', free: true, starter: true, business: true, pro: true, enterprise: true },
  { label: 'Print-ready A4 with crop marks', free: true, starter: true, business: true, pro: true, enterprise: true },
  { label: 'PDF files only', free: true, starter: true, business: true, pro: true, enterprise: true },
  { label: 'Watermark on output', free: 'Yes', starter: 'None', business: 'None', pro: 'None', enterprise: 'None' },
  { label: 'Bulk CSV mode', free: false, starter: false, business: true, pro: true, enterprise: true },
  { label: 'Multiple team members', free: false, starter: false, business: false, pro: true, enterprise: true },
  { label: 'Multi-center branding', free: false, starter: false, business: false, pro: true, enterprise: true },
  { label: 'Saved student database', free: false, starter: false, business: false, pro: false, enterprise: true },
  { label: 'Support', free: 'Community', starter: 'Email', business: 'Priority email', pro: 'Priority email', enterprise: 'Dedicated' },
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
              <th className="p-4 text-center font-semibold">Free</th>
              <th className="p-4 text-center font-semibold">Starter</th>
              <th className="p-4 text-center font-semibold text-primary">Business</th>
              <th className="p-4 text-center font-semibold">Pro</th>
              <th className="p-4 text-center font-semibold">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.label} className={cn('border-t', idx % 2 === 1 && 'bg-muted/20')}>
                <td className="p-4 font-medium">{r.label}</td>
                <td className="p-4 text-center">{renderCell(r.free)}</td>
                <td className="p-4 text-center">{renderCell(r.starter)}</td>
                <td className="p-4 text-center">{renderCell(r.business)}</td>
                <td className="p-4 text-center">{renderCell(r.pro)}</td>
                <td className="p-4 text-center">{renderCell(r.enterprise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
