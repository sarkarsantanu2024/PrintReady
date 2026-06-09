import { useRef } from "react";
import { Upload as UploadIcon, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { IdCardLayout } from "@/lib/idcard/layout";

interface Props {
  layout: IdCardLayout;
  onChange: (next: IdCardLayout) => void;
}

/**
 * Branding-only editor. Card dimensions, photo size, fonts and header height
 * are fixed to Kolkata / India market standard and intentionally not exposed.
 */
export function IdCardConfig({ layout, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const setHeader = <K extends keyof IdCardLayout["header"]>(
    k: K,
    v: IdCardLayout["header"][K],
  ) => onChange({ ...layout, header: { ...layout.header, [k]: v } });

  const onLogoFile = async (file: File) => {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/png"),
    );
    if (!blob) return;
    const png = new Uint8Array(await blob.arrayBuffer());
    onChange({
      ...layout,
      header: {
        ...layout.header,
        logoPng: png,
        logoDataUrl: canvas.toDataURL("image/png"),
      },
    });
  };

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Header branding
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Card size (88 × 56 mm), photo size and typography are fixed so 10
          cards fill an A4 sheet. Edit the header content and card colour below.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
          {layout.header.logoDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              src={layout.header.logoDataUrl}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-muted-foreground">No logo</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon className="mr-1.5 h-3.5 w-3.5" /> Upload logo
          </Button>
          {layout.header.logoPng && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  ...layout,
                  header: {
                    ...layout.header,
                    logoPng: null,
                    logoDataUrl: null,
                  },
                })
              }
            >
              <X className="mr-1 h-3 w-3" /> Remove
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onLogoFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <TextField
        label="Company name"
        value={layout.header.companyName}
        onChange={(v) => setHeader("companyName", v)}
      />
      <TextField
        label="Tagline"
        value={layout.header.tagline}
        onChange={(v) => setHeader("tagline", v)}
      />
      <TextField
        label="Website"
        value={layout.header.website}
        onChange={(v) => setHeader("website", v)}
      />

      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Header background"
          value={layout.header.bgColor}
          onChange={(v) => setHeader("bgColor", v)}
        />
        <ColorField
          label="Header text"
          value={layout.header.textColor}
          onChange={(v) => setHeader("textColor", v)}
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-[10px]">Card background</Label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CARD_BG_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...layout, cardBgColor: c })}
              className={`h-7 w-7 rounded-md border transition ${
                layout.cardBgColor.toLowerCase() === c.toLowerCase()
                  ? "ring-2 ring-primary ring-offset-1"
                  : "hover:scale-105"
              }`}
              style={{ background: c }}
              aria-label={`Card background ${c}`}
            />
          ))}
        </div>
        <ColorField
          label="Custom"
          value={layout.cardBgColor}
          onChange={(v) => onChange({ ...layout, cardBgColor: v })}
        />
      </div>
    </Card>
  );
}

const CARD_BG_PRESETS = [
  "#fff164",
  "#ffffff",
  "#fde68a",
  "#bfdbfe",
  "#bbf7d0",
  "#fbcfe8",
  "#fed7aa",
  "#e9d5ff",
];

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1 block text-[10px]">{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1 block text-[10px]">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-mono uppercase"
        />
      </div>
    </div>
  );
}
