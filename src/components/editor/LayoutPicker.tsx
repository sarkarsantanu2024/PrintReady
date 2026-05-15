import { CreditCard, Award, Contact } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LAYOUT_LIST } from '@/layouts';
import type { LayoutKind } from '@/layouts/types';

const ICONS: Record<LayoutKind, React.ComponentType<{ className?: string }>> = {
  id_card: Contact,
  business_card: CreditCard,
  certificate: Award,
};

interface LayoutPickerProps {
  value: LayoutKind;
  onChange: (kind: LayoutKind) => void;
}

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1.5">
      {LAYOUT_LIST.map((meta) => {
        const Icon = ICONS[meta.kind];
        const active = meta.kind === value;
        return (
          <button
            key={meta.kind}
            type="button"
            onClick={() => onChange(meta.kind)}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/50',
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
