import { rgb, type PDFPage } from 'pdf-lib';
import { mmToPt } from './units';

const SWATCH_WIDTH = mmToPt(8);
const SWATCH_HEIGHT = mmToPt(4);

/**
 * Draws a press-calibration color strip near the top of the sheet.
 * Includes CMYK-equivalent and RGB primaries.
 */
export function drawColorBars(page: PDFPage, sheetWidthPt: number, sheetHeightPt: number) {
  const swatches = [
    rgb(0, 1, 1), // Cyan
    rgb(1, 0, 1), // Magenta
    rgb(1, 1, 0), // Yellow
    rgb(0, 0, 0), // Key (black)
    rgb(1, 0, 0), // R
    rgb(0, 1, 0), // G
    rgb(0, 0, 1), // B
    rgb(0.5, 0.5, 0.5), // 50% gray
  ];

  const totalWidth = swatches.length * SWATCH_WIDTH;
  const startX = (sheetWidthPt - totalWidth) / 2;
  const y = sheetHeightPt - mmToPt(5) - SWATCH_HEIGHT;

  swatches.forEach((color, i) => {
    page.drawRectangle({
      x: startX + i * SWATCH_WIDTH,
      y,
      width: SWATCH_WIDTH,
      height: SWATCH_HEIGHT,
      color,
    });
  });
}
