// Render page 1 of a PDF, run the SAME photo-region logic as extract.ts, crop it,
// and save to scripts/out-crop.png so the result can be eyeballed.
// Run: node scripts/verify-crop.mjs "<path-to-pdf>"
import { readFile, writeFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';

const pdfPath = process.argv[2];
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

function mul(a, b) {
  return [
    b[0] * a[0] + b[1] * a[2], b[0] * a[1] + b[1] * a[3],
    b[2] * a[0] + b[3] * a[2], b[2] * a[1] + b[3] * a[3],
    b[4] * a[0] + b[5] * a[2] + a[4], b[4] * a[1] + b[5] * a[3] + a[5],
  ];
}
function encloses(a, b) {
  if (a === b) return false;
  if (a.w * a.h < b.w * b.h * 1.5) return false;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  return cx >= a.x && cx <= a.x + a.w && cy >= a.y && cy <= a.y + a.h;
}

const data = new Uint8Array(await readFile(pdfPath));
const doc = await pdfjs.getDocument({ data }).promise;
const page = await doc.getPage(1);
const OPS = pdfjs.OPS;

// --- images ---
const opList = await page.getOperatorList();
const stack = []; let ctm = [1, 0, 0, 1, 0, 0];
const candidates = [];
for (let i = 0; i < opList.fnArray.length; i++) {
  const fn = opList.fnArray[i]; const args = opList.argsArray[i];
  if (fn === OPS.save) stack.push(ctm.slice());
  else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
  else if (fn === OPS.transform) ctm = mul(ctm, args);
  else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm.slice()); const m = args?.[0]; if (m && m.length === 6) ctm = mul(ctm, m); }
  else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
  else if (fn === OPS.paintImageXObject || fn === OPS.paintImageXObjectRepeat || fn === OPS.paintJpegXObject || fn === OPS.paintInlineImageXObject) {
    const w = Math.hypot(ctm[0], ctm[1]); const h = Math.hypot(ctm[2], ctm[3]);
    if (w > 20 && h > 20) candidates.push({ x: ctm[4], y: ctm[5], w, h });
  }
}
const bands = candidates.filter((c) => c.w / c.h > 2.5);
const enclosing = candidates.filter((c) => bands.some((b) => encloses(c, b)));
const cardRaster = enclosing.length ? enclosing.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b)) : null;

// --- text within card ---
const tc = await page.getTextContent();
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (const it of tc.items) {
  if (!it.str || !it.str.trim()) continue;
  const x = it.transform[4], y = it.transform[5], w = it.width ?? 0, h = it.height ?? 8;
  if (cardRaster) { const m = 5; if (x < cardRaster.x - m || x > cardRaster.x + cardRaster.w + m || y < cardRaster.y - m || y > cardRaster.y + cardRaster.h + m) continue; }
  if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + w > x1) x1 = x + w; if (y + h > y1) y1 = y + h;
}
const layout = { x0, y0, x1, y1, valid: Number.isFinite(x0) && x1 > x0 };

// --- region (path 2: flattened card) ---
let region = null;
if (cardRaster && layout.valid) {
  const rows = layout.y1 - layout.y0;
  const left = cardRaster.x + 2;
  const right = layout.x0 - 4;
  const headerBottom = bands.filter((b) => b.y > layout.y1 - 2).reduce((min, b) => Math.min(min, b.y), Infinity);
  const headroom = rows * 0.18;
  let top = layout.y1 + headroom;
  if (Number.isFinite(headerBottom)) top = Math.min(top, headerBottom - 1);
  const bottom = Math.max(cardRaster.y, layout.y0 - headroom * 0.5);
  region = { x: left, y: bottom, w: right - left, h: top - bottom };
}
console.log('cardRaster:', cardRaster);
console.log('layout:', layout);
console.log('region:', region);

// --- render + crop ---
const SCALE = 3;
const vp = page.getViewport({ scale: SCALE });
const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
const ctx = canvas.getContext('2d');
await page.render({ canvasContext: ctx, viewport: vp }).promise;

const cx = region.x * SCALE;
const cyTop = canvas.height - (region.y + region.h) * SCALE;
const cw = region.w * SCALE;
const ch = region.h * SCALE;
const crop = createCanvas(Math.round(cw), Math.round(ch));
crop.getContext('2d').drawImage(canvas, cx, cyTop, cw, ch, 0, 0, crop.width, crop.height);
await writeFile('scripts/out-crop.png', crop.toBuffer('image/png'));
await writeFile('scripts/out-full.png', canvas.toBuffer('image/png'));
console.log('wrote scripts/out-crop.png (', crop.width, 'x', crop.height, ')');
