import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import QRCode from 'qrcode';
import { mmToPt, sheetDimensionsPt } from '@/lib/pdf/units';
import type { ExtractedIdCard } from './types';
import { DEFAULT_LAYOUT, hexToRgb01, type IdCardLayout } from './layout';

/** Optional per-card verification URLs (Verifiable-QR add-on), aligned by index. */
export interface ComposeOptions {
  qrUrls?: (string | null)[];
}

// Forced grid — 2 columns × 5 rows = 10 cards per A4 sheet.
const FORCED_COLS = 2;
const FORCED_ROWS = 5;
const CARDS_PER_PAGE = FORCED_COLS * FORCED_ROWS;

/**
 * Composes a multi-up print-ready PDF from a list of extracted ID cards using
 * the supplied layout. Cards are tiled with corner crop marks and optional
 * bleed guides for guillotine cutting.
 */
export async function composeIdCardsPdf(
  cards: ExtractedIdCard[],
  layout: IdCardLayout = DEFAULT_LAYOUT,
  options: ComposeOptions = {},
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('PrintReady — ID Cards');
  pdf.setProducer('PrintReady');
  pdf.setCreator('PrintReady — print at 100%');

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const photoImages = await Promise.all(
    cards.map((c) => (c.photoPng ? pdf.embedPng(c.photoPng) : Promise.resolve(null))),
  );
  const logoImage = layout.header.logoPng ? await pdf.embedPng(layout.header.logoPng) : null;

  // Render each verify QR as a crisp PNG (from the qrcode lib) and embed it —
  // far more reliable/scannable than hand-drawn vector modules.
  const qrImages = await Promise.all(
    cards.map(async (_, i) => {
      const url = options.qrUrls?.[i];
      if (!url) return null;
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#000000', light: '#ffffff' },
      });
      return pdf.embedPng(dataUrl);
    }),
  );

  const sheet = sheetDimensionsPt(layout.pageSize, layout.orientation);
  const cardW = mmToPt(layout.cardWidthMm);
  const cardH = mmToPt(layout.cardHeightMm);

  // Cards are tiled with zero gap so cuts run continuously across the sheet.
  const gridW = FORCED_COLS * cardW;
  const gridH = FORCED_ROWS * cardH;
  const originX = (sheet.w - gridW) / 2;
  const originY = (sheet.h - gridH) / 2;

  for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) {
    const batch = cards.slice(i, i + CARDS_PER_PAGE);
    const batchPhotos = photoImages.slice(i, i + CARDS_PER_PAGE);
    const page = pdf.addPage([sheet.w, sheet.h]);

    batch.forEach((card, idx) => {
      const col = idx % FORCED_COLS;
      const row = Math.floor(idx / FORCED_COLS);
      const x = originX + col * cardW;
      const y = originY + (FORCED_ROWS - 1 - row) * cardH;
      const qrImg = qrImages[i + idx] ?? null;
      drawIdCard(page, x, y, cardW, cardH, card, batchPhotos[idx], logoImage, layout, {
        font,
        fontBold,
        fontItalic,
      }, qrImg);
    });

    drawOuterTrimTicks(page, originX, originY, cardW, cardH);
  }

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

function drawIdCard(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  card: ExtractedIdCard,
  photo: PDFImage | null,
  logo: PDFImage | null,
  layout: IdCardLayout,
  fonts: { font: PDFFont; fontBold: PDFFont; fontItalic: PDFFont },
  qrImg: PDFImage | null = null,
) {
  const { font, fontBold, fontItalic } = fonts;
  const cardBg = hexToRgb01(layout.cardBgColor);
  const border = hexToRgb01(layout.cardBorderColor);
  const labelCol = hexToRgb01(layout.labelColor);
  const valueCol = hexToRgb01(layout.valueColor);
  const headerBg = hexToRgb01(layout.header.bgColor);
  const headerText = hexToRgb01(layout.header.textColor);

  // Card body
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: rgb(cardBg.r, cardBg.g, cardBg.b),
    borderColor: rgb(border.r, border.g, border.b),
    borderWidth: 0.4,
  });

  const innerX = x;
  const innerRight = x + w;
  const headerColor = rgb(headerText.r, headerText.g, headerText.b);

  // Header strip — full-bleed across the top of the card.
  const headerH = mmToPt(layout.header.heightMm);
  const headerTop = y + h - headerH;
  page.drawRectangle({
    x: innerX,
    y: headerTop,
    width: w,
    height: headerH,
    color: rgb(headerBg.r, headerBg.g, headerBg.b),
  });

  const headerPad = mmToPt(3); // 12px @ 4px/mm
  let textOriginX = innerX + headerPad;

  // Fixed-height logo (≈30px in the preview) with space to its right.
  if (logo) {
    const logoBoxH = Math.min(mmToPt(7.5), headerH - mmToPt(2));
    const aspect = logo.width / logo.height;
    const logoW = logoBoxH * aspect;
    page.drawImage(logo, {
      x: innerX + headerPad,
      y: headerTop + (headerH - logoBoxH) / 2,
      width: logoW,
      height: logoBoxH,
    });
    textOriginX = innerX + headerPad + logoW + mmToPt(3);
  }

  const nameSize = Math.min(layout.nameSize, headerH / 3);
  const subSize = Math.max(5, nameSize - 3);

  // Company name (bold) + tagline + website, stacked and vertically centred.
  const headerTextWidth = innerRight - headerPad - textOriginX;
  const lineGap = 1.5;
  const totalHeaderTextH =
    nameSize +
    (layout.header.tagline ? lineGap + subSize : 0) +
    (layout.header.website ? lineGap + subSize : 0);
  let lineY = headerTop + (headerH + totalHeaderTextH) / 2 - nameSize;

  drawClipped(page, layout.header.companyName, textOriginX, lineY, headerTextWidth, nameSize, fontBold, headerColor);
  if (layout.header.tagline) {
    lineY -= subSize + lineGap;
    drawClipped(page, layout.header.tagline, textOriginX, lineY, headerTextWidth, subSize, font, headerColor);
  }
  if (layout.header.website) {
    lineY -= subSize + lineGap;
    drawClipped(page, layout.header.website, textOriginX, lineY, headerTextWidth, subSize, fontItalic, headerColor);
  }

  // Photo slot — top-left, flush below the header.
  const photoGap = mmToPt(3); // 12px body padding
  const photoX = innerX + photoGap;
  const photoW = mmToPt(layout.photoWidthMm);
  const photoH = mmToPt(layout.photoHeightMm);
  const photoY = headerTop - photoGap - photoH;
  // Background fill (shows behind a letter-boxed / missing photo).
  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    color: rgb(0.94, 0.95, 0.97),
  });
  if (photo) {
    const ar = photo.width / photo.height;
    const slotAr = photoW / photoH;
    let drawW = photoW;
    let drawH = photoH;
    if (ar > slotAr) drawH = photoW / ar;
    else drawW = photoH * ar;
    page.drawImage(photo, {
      x: photoX + (photoW - drawW) / 2,
      y: photoY + (photoH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }
  // Black frame drawn ON TOP of the photo so the border is always visible.
  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1.5,
  });

  // Verifiable-QR (paid add-on) — TOP-RIGHT corner of the card body, just below
  // the header. Sized large enough to scan reliably; the field text below wraps
  // to a narrower column beside it, then uses full width once it clears the QR.
  let qrLeftEdge = innerRight - mmToPt(3); // right boundary for text (no QR → full)
  let qrBottomY = headerTop; // nothing reserved when there's no QR
  if (qrImg) {
    const qrSize = mmToPt(14);
    const qrX = innerRight - mmToPt(2.5) - qrSize;
    const qrY = headerTop - mmToPt(2) - qrSize;
    page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    qrLeftEdge = qrX - mmToPt(2);
    qrBottomY = qrY - mmToPt(1);
  }

  // Text block to the right of the photo — top-aligned with the photo.
  const textX = photoX + photoW + mmToPt(3);
  const fullRight = innerRight - mmToPt(3);
  const photoTop = photoY + photoH;
  let cursorY = photoTop - layout.labelSize * 0.72; // 0.72 ≈ Helvetica cap height

  // Usable text width at a baseline y — narrower while beside the QR (top),
  // full width once we drop below it.
  const widthAt = (yb: number) => (qrImg && yb > qrBottomY ? qrLeftEdge : fullRight) - textX;

  const fields: { label: string; value: string; isName?: boolean }[] = [
    { label: 'Name', value: card.fields.name, isName: true },
    { label: 'Center', value: card.fields.centerName },
    { label: 'Phone', value: card.fields.phone },
    { label: 'Address', value: card.fields.address },
    { label: 'Guardian', value: card.fields.guardianName },
  ];

  for (const { label, value, isName } of fields) {
    page.drawText(label.toUpperCase(), {
      x: textX,
      y: cursorY,
      size: layout.labelSize,
      font: fontBold,
      color: rgb(labelCol.r, labelCol.g, labelCol.b),
    });
    cursorY -= layout.labelSize + 2;
    const valSize = isName ? layout.nameSize : layout.valueSize;
    const valFont = isName ? fontBold : font;
    const drawLine = (txt: string) => {
      page.drawText(txt, {
        x: textX,
        y: cursorY,
        size: valSize,
        font: valFont,
        color: rgb(valueCol.r, valueCol.g, valueCol.b),
      });
      cursorY -= valSize + 1;
    };
    // Wrap with a width that depends on the current line's position (around QR).
    let line = '';
    for (const word of (value || '—').split(/\s+/)) {
      const cand = line ? `${line} ${word}` : word;
      if (valFont.widthOfTextAtSize(cand, valSize) <= widthAt(cursorY)) {
        line = cand;
        continue;
      }
      if (line) {
        drawLine(line);
        line = '';
      }
      const maxW = widthAt(cursorY);
      if (valFont.widthOfTextAtSize(word, valSize) > maxW) {
        let t = word;
        while (t.length > 1 && valFont.widthOfTextAtSize(`${t}…`, valSize) > maxW) t = t.slice(0, -1);
        drawLine(`${t}…`);
      } else {
        line = word;
      }
    }
    if (line) drawLine(line);
    cursorY -= 1.5; // breathing space between fields
  }
}

/**
 * Outer trim ticks: small marks on the outside of the card grid only.
 * At each cut line (between rows / columns + the four outer edges) we draw
 * a short tick that overhangs the sheet edge. No marks land between cards.
 */
function drawOuterTrimTicks(
  page: PDFPage,
  originX: number,
  originY: number,
  cardW: number,
  cardH: number,
) {
  const tickLen = mmToPt(3);
  const offset = mmToPt(1);
  const thickness = 0.5;
  const color = rgb(0, 0, 0);
  const gridRight = originX + FORCED_COLS * cardW;
  const gridTop = originY + FORCED_ROWS * cardH;

  // Vertical cut lines — ticks above the top edge and below the bottom edge
  for (let c = 0; c <= FORCED_COLS; c++) {
    const x = originX + c * cardW;
    page.drawLine({
      start: { x, y: gridTop + offset },
      end: { x, y: gridTop + offset + tickLen },
      thickness,
      color,
    });
    page.drawLine({
      start: { x, y: originY - offset },
      end: { x, y: originY - offset - tickLen },
      thickness,
      color,
    });
  }

  // Horizontal cut lines — ticks left of the left edge and right of the right edge
  for (let r = 0; r <= FORCED_ROWS; r++) {
    const y = originY + r * cardH;
    page.drawLine({
      start: { x: originX - offset, y },
      end: { x: originX - offset - tickLen, y },
      thickness,
      color,
    });
    page.drawLine({
      start: { x: gridRight + offset, y },
      end: { x: gridRight + offset + tickLen, y },
      thickness,
      color,
    });
  }
}


function drawClipped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
) {
  let out = text;
  if (font.widthOfTextAtSize(out, size) > maxWidth) {
    while (out.length > 1 && font.widthOfTextAtSize(out + '…', size) > maxWidth) {
      out = out.slice(0, -1);
    }
    out = out + '…';
  }
  page.drawText(out, { x, y, size, font, color });
}

