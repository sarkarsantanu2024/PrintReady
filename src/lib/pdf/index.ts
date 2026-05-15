import { PDFDocument, type PDFPage } from 'pdf-lib';
import { sheetDimensionsPt } from './units';
import { DEFAULT_PRINT_OPTIONS, type PrintOptions } from './types';
import { placeGrid, type PlacedCard, suggestGrid } from './grid-layout';
import { drawCropMarks } from './crop-marks';
import { drawFoldMarks } from './fold-marks';
import { drawRegistrationMarks } from './registration-marks';
import { drawColorBars } from './color-bars';
import { drawBleedGuides } from './bleed';
import { drawFooterNote, drawWatermark } from './footer';

export * from './types';
export * from './units';
export * from './grid-layout';

/**
 * Decorates a single sheet with the configured marks: bleed, crop, fold,
 * registration, color bars, watermark, footer note.
 *
 * Cards are passed in for crop marks. If the page is a single-piece centered
 * layout, pass a single PlacedCard covering the trim area.
 */
export async function decorateSheet(
  pdf: PDFDocument,
  page: PDFPage,
  cards: PlacedCard[],
  options: PrintOptions,
) {
  const merged = { ...DEFAULT_PRINT_OPTIONS, ...options };
  const { width, height } = page.getSize();

  if (merged.bleed > 0) drawBleedGuides(page, cards, merged.bleed);
  if (merged.cropMarks) drawCropMarks(page, cards, merged.cropMarkStyle);
  drawFoldMarks(page, width, height, merged.foldMarks);
  if (merged.registrationMarks) drawRegistrationMarks(page, width, height);
  if (merged.colorBars) drawColorBars(page, width, height);
  if (merged.watermark) await drawWatermark(pdf, page, merged.watermark);
  await drawFooterNote(pdf, page);
}

/**
 * UploadedFile shape consumed by `generateFromUpload`. Either an embedded PDF
 * page (we re-embed pdf-lib's PDFEmbeddedPage) or an embedded raster image.
 */
export interface UploadedFile {
  /** Original file for filename / metadata. */
  file: File;
  /** Detected dimensions in mm at 100% scale. */
  widthMm: number;
  heightMm: number;
  /** Loaded bytes — used to embed into the output PDF. */
  bytes: Uint8Array;
  /** Type hint for embed strategy. */
  kind: 'pdf' | 'png' | 'jpg';
}

/**
 * Composes a print-ready PDF from an uploaded design file.
 *
 * - PDF input: embeds the first page.
 * - Image input: embeds as a single image.
 *
 * If `gridLayout` is set, repeats the design across an N×M grid; otherwise
 * places once at the center of the sheet.
 */
export async function generateFromUpload(
  source: UploadedFile,
  options: PrintOptions,
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(source.file.name.replace(/\.[^.]+$/, ''));
  pdf.setProducer('PrintReady');
  pdf.setCreator('PrintReady — print at 100%');

  const sheet = sheetDimensionsPt(options.pageSize, options.orientation);
  const page = pdf.addPage([sheet.w, sheet.h]);

  // Embed source content
  let embedDraw: (card: PlacedCard) => void;
  if (source.kind === 'pdf') {
    const srcPdf = await PDFDocument.load(source.bytes);
    const [embedded] = await pdf.embedPdf(srcPdf, [0]);
    embedDraw = (c) => {
      page.drawPage(embedded, { x: c.x, y: c.y, width: c.w, height: c.h });
    };
  } else if (source.kind === 'png') {
    const img = await pdf.embedPng(source.bytes);
    embedDraw = (c) => {
      page.drawImage(img, { x: c.x, y: c.y, width: c.w, height: c.h });
    };
  } else {
    const img = await pdf.embedJpg(source.bytes);
    embedDraw = (c) => {
      page.drawImage(img, { x: c.x, y: c.y, width: c.w, height: c.h });
    };
  }

  // Determine card placement
  let cards: PlacedCard[];
  if (options.gridLayout) {
    cards = placeGrid(sheet.w, sheet.h, options.gridLayout);
  } else {
    // Single-piece centered: card = source dimensions, centered.
    const cardW = (source.widthMm * 72) / 25.4;
    const cardH = (source.heightMm * 72) / 25.4;
    const x = (sheet.w - cardW) / 2;
    const y = (sheet.h - cardH) / 2;
    cards = [{ x, y, w: cardW, h: cardH }];
  }

  for (const c of cards) embedDraw(c);
  await decorateSheet(pdf, page, cards, options);

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

/** Convenience helper to suggest a grid for a card-shaped design. */
export function suggestGridForSize(
  options: Pick<PrintOptions, 'pageSize' | 'orientation'>,
  cardWidthMm: number,
  cardHeightMm: number,
  gapMm = 5,
) {
  const sheet = sheetDimensionsPt(options.pageSize, options.orientation);
  return suggestGrid(sheet.w, sheet.h, cardWidthMm, cardHeightMm, gapMm);
}
