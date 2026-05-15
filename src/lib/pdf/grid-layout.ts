import type { GridLayout } from './types';
import { mmToPt } from './units';

export interface PlacedCard {
  /** x in points, from page bottom-left (pdf-lib convention). */
  x: number;
  /** y in points, from page bottom-left. */
  y: number;
  /** width in points. */
  w: number;
  /** height in points. */
  h: number;
}

/**
 * Calculates where each card sits on the sheet, centered as a block.
 * Returns positions in pdf-lib coordinates (origin = bottom-left, y up).
 */
export function placeGrid(
  sheetWidthPt: number,
  sheetHeightPt: number,
  layout: GridLayout,
): PlacedCard[] {
  const cardW = mmToPt(layout.cardWidth);
  const cardH = mmToPt(layout.cardHeight);
  const gap = mmToPt(layout.gap);

  const totalW = layout.cols * cardW + (layout.cols - 1) * gap;
  const totalH = layout.rows * cardH + (layout.rows - 1) * gap;

  // If the grid is wider than the sheet, anchor to the left margin instead of overflowing.
  const offsetX = Math.max(0, (sheetWidthPt - totalW) / 2);
  const offsetY = Math.max(0, (sheetHeightPt - totalH) / 2);

  const placed: PlacedCard[] = [];
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const x = offsetX + c * (cardW + gap);
      // Lay out top-to-bottom visually but in pdf-lib y grows upward.
      const yFromTop = offsetY + r * (cardH + gap);
      const y = sheetHeightPt - yFromTop - cardH;
      placed.push({ x, y, w: cardW, h: cardH });
    }
  }
  return placed;
}

/** Suggests a sensible cols × rows that fits N cards on the sheet. */
export function suggestGrid(
  sheetWidthPt: number,
  sheetHeightPt: number,
  cardWidthMm: number,
  cardHeightMm: number,
  gapMm = 5,
): { cols: number; rows: number; perSheet: number } {
  const cardW = mmToPt(cardWidthMm) + mmToPt(gapMm);
  const cardH = mmToPt(cardHeightMm) + mmToPt(gapMm);
  const cols = Math.max(1, Math.floor((sheetWidthPt + mmToPt(gapMm)) / cardW));
  const rows = Math.max(1, Math.floor((sheetHeightPt + mmToPt(gapMm)) / cardH));
  return { cols, rows, perSheet: cols * rows };
}
