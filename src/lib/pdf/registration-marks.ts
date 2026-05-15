import { rgb, type PDFPage } from 'pdf-lib';
import { mmToPt } from './units';

const MARK_RADIUS = mmToPt(2);
const OFFSET = mmToPt(5);
const STROKE = 0.5;
const COLOR = rgb(0, 0, 0);

/**
 * Draws cross-hair registration marks in the four corners of the sheet (outside
 * the imaginable trim area). Used by commercial printers for plate alignment.
 */
export function drawRegistrationMarks(page: PDFPage, sheetWidthPt: number, sheetHeightPt: number) {
  const r = MARK_RADIUS;
  const o = OFFSET;
  const positions: [number, number][] = [
    [o, o],
    [sheetWidthPt - o, o],
    [o, sheetHeightPt - o],
    [sheetWidthPt - o, sheetHeightPt - o],
  ];
  for (const [cx, cy] of positions) {
    page.drawCircle({ x: cx, y: cy, size: r, borderColor: COLOR, borderWidth: STROKE });
    page.drawLine({
      start: { x: cx - r * 1.5, y: cy },
      end: { x: cx + r * 1.5, y: cy },
      thickness: STROKE,
      color: COLOR,
    });
    page.drawLine({
      start: { x: cx, y: cy - r * 1.5 },
      end: { x: cx, y: cy + r * 1.5 },
      thickness: STROKE,
      color: COLOR,
    });
  }
}
