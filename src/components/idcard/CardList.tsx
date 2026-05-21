import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ImagePlus, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ExtractedIdCard, IdCardFields } from '@/lib/idcard/types';

interface Props {
  cards: ExtractedIdCard[];
  /** Called when the user replaces (or restores) a card's photo. */
  onReplacePhoto: (index: number, photoPng: Uint8Array | null) => void;
  /** Called when the user edits any text field. */
  onChangeFields: (index: number, fields: IdCardFields) => void;
  /** Indexes whose photos were auto-extracted (so we can offer "restore"). */
  originalPhotos: (Uint8Array | null)[];
}

export function CardList({ cards, onReplacePhoto, onChangeFields, originalPhotos }: Props) {
  return (
    <Card className="p-5">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Extracted cards ({cards.length})
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Photos and details are pulled automatically from each PDF. Click a row to edit.
      </p>
      <ul className="divide-y">
        {cards.map((c, i) => (
          <Row
            key={i}
            card={c}
            wasExtracted={!!originalPhotos[i]}
            isOriginal={c.photoPng === originalPhotos[i]}
            onPick={(png) => onReplacePhoto(i, png)}
            onRestore={() => onReplacePhoto(i, originalPhotos[i])}
            onChangeFields={(fields) => onChangeFields(i, fields)}
          />
        ))}
      </ul>
    </Card>
  );
}

function Row({
  card,
  wasExtracted,
  isOriginal,
  onPick,
  onRestore,
  onChangeFields,
}: {
  card: ExtractedIdCard;
  wasExtracted: boolean;
  isOriginal: boolean;
  onPick: (png: Uint8Array) => void;
  onRestore: () => void;
  onChangeFields: (fields: IdCardFields) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const handleFile = async (file: File) => {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) return;
    onPick(new Uint8Array(await blob.arrayBuffer()));
  };

  const photoUrl = card.photoPng ? bytesToObjectUrl(card.photoPng) : null;

  const setField = <K extends keyof IdCardFields>(k: K, v: IdCardFields[K]) =>
    onChangeFields({ ...card.fields, [k]: v });

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={open ? 'Collapse' : 'Edit details'}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
          {photoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={photoUrl} className="h-full w-full object-cover" />
          ) : (
            <span className="px-1 text-center text-[9px] text-muted-foreground">No photo</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{card.fields.name || '—'}</p>
          <p className="truncate text-xs text-muted-foreground">
            {card.fields.centerName || card.sourceFilename}
          </p>
          {!card.photoPng && (
            <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
              No photo detected — upload one.
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          {wasExtracted && !isOriginal && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRestore}
              title="Restore the photo extracted from the PDF"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
            <ImagePlus className="mr-1 h-3.5 w-3.5" />
            {card.photoPng ? 'Replace' : 'Upload'}
          </Button>
          <input
            ref={ref}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-md border bg-muted/20 p-3">
          <Field
            label="Name"
            value={card.fields.name}
            onChange={(v) => setField('name', v)}
          />
          <Field
            label="Center"
            value={card.fields.centerName}
            onChange={(v) => setField('centerName', v)}
          />
          <Field
            label="Phone"
            value={card.fields.phone}
            onChange={(v) => setField('phone', v)}
          />
          <Field
            label="Guardian"
            value={card.fields.guardianName}
            onChange={(v) => setField('guardianName', v)}
          />
          <Field
            label="Address"
            value={card.fields.address}
            onChange={(v) => setField('address', v)}
            className="col-span-2"
            textarea
          />
        </div>
      )}
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  textarea?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-[10px]">{label}</Label>
      {textarea ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      )}
    </div>
  );
}

const urlCache = new WeakMap<Uint8Array, string>();
function bytesToObjectUrl(bytes: Uint8Array): string {
  const cached = urlCache.get(bytes);
  if (cached) return cached;
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }));
  urlCache.set(bytes, url);
  return url;
}
