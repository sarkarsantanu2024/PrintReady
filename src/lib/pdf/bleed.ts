import { rgb, type PDFPage } from 'pdf-lib';
import type { PlacedCard } from './grid-layout';
import { mmToPt } from './units';

/**
 * Outlines the bleed safety zone around each card. Drawn as a faint dashed
 * rectangle so the user can see where their design needs artwork to extend.
 *
 * In the upload flow we don't actually expand the placed image — we trust the
 * user to deliver bleed in their artwork. This just visually marks it.
 */
export function drawBleedGuides(page: PDFPage, cards: PlacedCard[], bleed: number) {
  if (bleed <= 0) return;
  const b = mmToPt(bleed);
  const COLOR = rgb(0.85, 0.45, 0.1); // soft accent orange
  for (const c of cards) {
    page.drawRectangle({
      x: c.x - b,
      y: c.y - b,
      width: c.w + b * 2,
      height: c.h + b * 2,
      borderColor: COLOR,
      borderWidth: 0.4,
      borderDashArray: [3, 2],
    });
  }
}
