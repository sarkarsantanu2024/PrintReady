import { rgb, type PDFPage } from 'pdf-lib';
import type { CropMarkStyle } from './types';
import type { PlacedCard } from './grid-layout';
import { mmToPt } from './units';

const MARK_LEN = mmToPt(3); // 3mm tick
const MARK_OFFSET = mmToPt(1); // 1mm gap from trim edge so they print outside the cut
const MARK_WEIGHT = 0.5;
const BLACK = rgb(0, 0, 0);

/**
 * Draws crop marks around each card on the page.
 * Style options match standard print-shop conventions.
 */
export function drawCropMarks(
  page: PDFPage,
  cards: PlacedCard[],
  style: CropMarkStyle = 'corner',
) {
  for (const c of cards) {
    switch (style) {
      case 'corner':
        drawCornerTicks(page, c);
        break;
      case 'full-bleed':
        drawFullBleed(page, c);
        break;
      case 'japanese':
        drawJapanese(page, c);
        break;
    }
  }
}

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: MARK_WEIGHT,
    color: BLACK,
  });
}

function drawCornerTicks(page: PDFPage, c: PlacedCard) {
  const o = MARK_OFFSET;
  const len = MARK_LEN;

  // Top-left
  line(page, c.x - o - len, c.y + c.h, c.x - o, c.y + c.h);
  line(page, c.x, c.y + c.h + o, c.x, c.y + c.h + o + len);
  // Top-right
  line(page, c.x + c.w + o, c.y + c.h, c.x + c.w + o + len, c.y + c.h);
  line(page, c.x + c.w, c.y + c.h + o, c.x + c.w, c.y + c.h + o + len);
  // Bottom-left
  line(page, c.x - o - len, c.y, c.x - o, c.y);
  line(page, c.x, c.y - o - len, c.x, c.y - o);
  // Bottom-right
  line(page, c.x + c.w + o, c.y, c.x + c.w + o + len, c.y);
  line(page, c.x + c.w, c.y - o - len, c.x + c.w, c.y - o);
}

function drawFullBleed(page: PDFPage, c: PlacedCard) {
  const ext = mmToPt(5);
  // Vertical lines at left/right trim, extending top and bottom
  line(page, c.x, c.y - ext, c.x, c.y);
  line(page, c.x, c.y + c.h, c.x, c.y + c.h + ext);
  line(page, c.x + c.w, c.y - ext, c.x + c.w, c.y);
  line(page, c.x + c.w, c.y + c.h, c.x + c.w, c.y + c.h + ext);
  // Horizontals
  line(page, c.x - ext, c.y, c.x, c.y);
  line(page, c.x + c.w, c.y, c.x + c.w + ext, c.y);
  line(page, c.x - ext, c.y + c.h, c.x, c.y + c.h);
  line(page, c.x + c.w, c.y + c.h, c.x + c.w + ext, c.y + c.h);
}

function drawJapanese(page: PDFPage, c: PlacedCard) {
  // Inner + outer pair of ticks at each corner — common in Japanese pre-press.
  drawCornerTicks(page, c);
  const inset = mmToPt(2);
  const inner: PlacedCard = {
    x: c.x + inset,
    y: c.y + inset,
    w: c.w - inset * 2,
    h: c.h - inset * 2,
  };
  drawCornerTicks(page, inner);
}
