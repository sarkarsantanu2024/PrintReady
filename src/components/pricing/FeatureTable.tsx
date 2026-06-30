import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Cell = boolean | string;

interface Row {
  label: string;
  free: Cell;
  business: Cell;
  enterprise: Cell;
  custom: Cell;
}

const rows: Row[] = [
  {
    label: "Print-ready PDFs / month",
    free: "10",
    business: "150",
    enterprise: "250",
    custom: "Tailored",
  },
  {
    label: "Monthly price",
    free: "₹0",
    business: "₹2300",
    enterprise: "₹3500",
    custom: "Custom",
  },
  {
    label: "Login required",
    free: "No",
    business: "Yes",
    enterprise: "Yes",
    custom: "Yes",
  },
  {
    label: "Auto-extract photo + details",
    free: true,
    business: true,
    enterprise: true,
    custom: true,
  },
  {
    label: "Print-ready A4 with crop marks",
    free: true,
    business: true,
    enterprise: true,
    custom: true,
  },
  {
    label: "Verifiable QR cards",
    free: false,
    business: true,
    enterprise: true,
    custom: false,
  },
  {
    label: "Generated report",
    free: false,
    business: true,
    enterprise: true,
    custom: true,
  },
  {
    label: "Saved student database",
    free: false,
    business: false,
    enterprise: true,
    custom: false,
  },
  {
    label: "Support",
    free: "Community",
    business: "Dedicated",
    enterprise: "Dedicated",
    custom: "Dedicated",
  },
];

function renderCell(cell: Cell) {
  if (cell === true) return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (cell === false)
    return <X className="mx-auto h-4 w-4 text-muted-foreground/50" />;
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
              <th className="p-4 text-center font-semibold text-primary">
                Business
              </th>
              <th className="p-4 text-center font-semibold">Enterprise</th>
              <th className="p-4 text-center font-semibold">Custom</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.label}
                className={cn("border-t", idx % 2 === 1 && "bg-muted/20")}
              >
                <td className="p-4 font-medium">{r.label}</td>
                <td className="p-4 text-center">{renderCell(r.free)}</td>
                <td className="p-4 text-center">{renderCell(r.business)}</td>
                <td className="p-4 text-center">{renderCell(r.enterprise)}</td>
                <td className="p-4 text-center">{renderCell(r.custom)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
