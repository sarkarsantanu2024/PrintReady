import { rgb, type PDFPage } from 'pdf-lib';
import type { FoldMarkStyle } from './types';
import { mmToPt } from './units';

const TICK_LEN = mmToPt(4);
const COLOR = rgb(0.45, 0.45, 0.45);

/**
 * Draws fold guides on the sheet. Marks appear in the bleed area (top + bottom).
 * Use for tri-fold leaflets, bi-fold cards, name tents.
 */
export function drawFoldMarks(
  page: PDFPage,
  sheetWidthPt: number,
  sheetHeightPt: number,
  style: FoldMarkStyle,
) {
  if (style === 'none') return;

  const xs: number[] = [];
  if (style === 'bi' || style === 'name-tent') {
    xs.push(sheetWidthPt / 2);
  } else if (style === 'tri') {
    xs.push(sheetWidthPt / 3, (sheetWidthPt * 2) / 3);
  }

  for (const x of xs) {
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: TICK_LEN },
      thickness: 0.5,
      color: COLOR,
      dashArray: [2, 2],
    });
    page.drawLine({
      start: { x, y: sheetHeightPt - TICK_LEN },
      end: { x, y: sheetHeightPt },
      thickness: 0.5,
      color: COLOR,
      dashArray: [2, 2],
    });
  }
}
