import { QRCodeCanvas } from "qrcode.react";
import type { IdCardLayout } from "@/lib/idcard/layout";
import type { ExtractedIdCard } from "@/lib/idcard/types";
import { verifyUrl } from "@/lib/idcard/verify";

interface Props {
  layout: IdCardLayout;
  sample: ExtractedIdCard;
  /** Scale factor for the preview (mm → px). 4 ≈ comfortable on screen. */
  pxPerMm?: number;
  /** Show the verifiable QR (top-right), matching the printed output. */
  qr?: boolean;
}

/**
 * On-screen CSS replica of a single card. Not pixel-perfect with the PDF
 * (different font metrics) but close enough to dial in proportions, colours,
 * and field placement before generating the print-ready file.
 */
export function CardPreview({ layout, sample, pxPerMm = 4, qr = false }: Props) {
  const w = layout.cardWidthMm * pxPerMm;
  const h = layout.cardHeightMm * pxPerMm;
  const headerH = layout.header.heightMm * pxPerMm;
  const photoW = layout.photoWidthMm * pxPerMm;
  const photoH = layout.photoHeightMm * pxPerMm;
  const photoSrc = sample.photoPng ? bytesToObjectUrl(sample.photoPng) : null;
  const qrSize = 14 * pxPerMm;

  return (
    <div
      className="relative overflow-hidden rounded-md shadow-sm"
      style={{
        width: w,
        height: h,
        background: layout.cardBgColor,
        border: `1px solid ${layout.cardBorderColor}`,
      }}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div
          className="flex items-center overflow-hidden"
          style={{
            height: headerH,
            background: layout.header.bgColor,
            color: layout.header.textColor,
            padding: `0 ${3 * pxPerMm}px`,
          }}
        >
          {layout.header.logoDataUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              src={layout.header.logoDataUrl}
              style={{
                height: 7.5 * pxPerMm,
                width: "auto",
                marginRight: 3 * pxPerMm,
                objectFit: "contain",
              }}
            />
          )}
          <div className="flex min-w-0 flex-col leading-tight">
            <span
              style={{ fontSize: layout.nameSize * 1.2, fontWeight: 700 }}
              className="truncate"
            >
              {layout.header.companyName}
            </span>
            {layout.header.tagline && (
              <span
                style={{ fontSize: (layout.nameSize - 3) * 1.2 }}
                className="truncate opacity-95"
              >
                {layout.header.tagline}
              </span>
            )}
            {layout.header.website && (
              <span
                style={{
                  fontSize: (layout.nameSize - 3) * 1.2,
                  fontStyle: "italic",
                }}
                className="truncate opacity-95"
              >
                {layout.header.website}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex" style={{ padding: 3 * pxPerMm, gap: 3 * pxPerMm }}>
          <div
            style={{
              width: photoW,
              height: photoH,
              background: "#eef0f3",
              border: `3px solid #000`,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {photoSrc && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img
                src={photoSrc}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            )}
          </div>
          <div
            className="min-w-0 flex-1"
            style={qr ? { paddingRight: qrSize + 2 * pxPerMm } : undefined}
          >
            <Field
              label="Name"
              value={sample.fields.name}
              labelSize={layout.labelSize}
              valueSize={layout.nameSize}
              labelColor={layout.labelColor}
              valueColor={layout.valueColor}
              pxPerMm={pxPerMm}
              bold
            />
            <Field
              label="Center"
              value={sample.fields.centerName}
              labelSize={layout.labelSize}
              valueSize={layout.valueSize}
              labelColor={layout.labelColor}
              valueColor={layout.valueColor}
              pxPerMm={pxPerMm}
            />
            <Field
              label="Phone"
              value={sample.fields.phone}
              labelSize={layout.labelSize}
              valueSize={layout.valueSize}
              labelColor={layout.labelColor}
              valueColor={layout.valueColor}
              pxPerMm={pxPerMm}
            />
            <Field
              label="Address"
              value={sample.fields.address}
              labelSize={layout.labelSize}
              valueSize={layout.valueSize}
              labelColor={layout.labelColor}
              valueColor={layout.valueColor}
              pxPerMm={pxPerMm}
            />
            <Field
              label="Guardian"
              value={sample.fields.guardianName}
              labelSize={layout.labelSize}
              valueSize={layout.valueSize}
              labelColor={layout.labelColor}
              valueColor={layout.valueColor}
              pxPerMm={pxPerMm}
            />
          </div>
        </div>
      </div>

      {qr && (
        <div
          style={{
            position: "absolute",
            top: headerH + 2 * pxPerMm,
            right: 2.5 * pxPerMm,
            background: "#fff",
            padding: 2,
            lineHeight: 0,
            borderRadius: 2,
          }}
          title="Sample verify QR — scan to test"
        >
          <QRCodeCanvas value={verifyUrl("SAMPLE")} size={qrSize} level="L" marginSize={2} />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  labelSize,
  valueSize,
  labelColor,
  valueColor,
  pxPerMm,
  bold,
}: {
  label: string;
  value: string;
  labelSize: number;
  valueSize: number;
  labelColor: string;
  valueColor: string;
  pxPerMm: number;
  bold?: boolean;
}) {
  return (
    <div style={{ marginBottom: 1.2 * pxPerMm }}>
      <div
        style={{
          fontSize: labelSize * 1.2,
          color: labelColor,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          lineHeight: 1.1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: valueSize * 1.2,
          color: valueColor,
          fontWeight: bold ? 700 : 500,
          lineHeight: 1.15,
          overflowWrap: "anywhere",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

const urlCache = new WeakMap<Uint8Array, string>();
function bytesToObjectUrl(bytes: Uint8Array): string {
  const cached = urlCache.get(bytes);
  if (cached) return cached;
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: "image/png" }),
  );
  urlCache.set(bytes, url);
  return url;
}
