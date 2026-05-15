/**
 * Unit conversion helpers — pdf-lib works in PostScript points (72pt = 1 inch).
 */
export const PT_PER_MM = 2.834645669; // 72 / 25.4
export const PT_PER_INCH = 72;

export const mmToPt = (mm: number): number => mm * PT_PER_MM;
export const ptToMm = (pt: number): number => pt / PT_PER_MM;
export const inchToPt = (inch: number): number => inch * PT_PER_INCH;

/** Sheet sizes in millimetres. */
export const SHEET_SIZES_MM = {
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 215.9, h: 279.4 },
  Legal: { w: 215.9, h: 355.6 },
} as const;

export type SheetSize = keyof typeof SHEET_SIZES_MM;
export type Orientation = 'portrait' | 'landscape';

/** Returns sheet width/height in points for a given size + orientation. */
export function sheetDimensionsPt(size: SheetSize, orientation: Orientation = 'portrait') {
  const { w, h } = SHEET_SIZES_MM[size];
  const wPt = mmToPt(w);
  const hPt = mmToPt(h);
  return orientation === 'landscape' ? { w: hPt, h: wPt } : { w: wPt, h: hPt };
}
