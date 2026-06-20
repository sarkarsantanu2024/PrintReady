import type { ExtractedIdCard, IdCardFields } from './types';

/**
 * Extracts ID-card data (text fields + photo) from a source PDF whose page 1
 * contains a Name / Center Name / Phone No / Address / Guardians Name block
 * plus an embedded photograph.
 *
 * The chrome (orange header, "Save as PDF" button) is discarded — we only
 * pull the fields and the first embedded image.
 */
export async function extractIdCard(file: File): Promise<ExtractedIdCard> {
  const pdfjs = await import('pdfjs-dist');
  const workerModule = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')) as {
    default: string;
  };
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);

  const fields = await extractFields(page);
  const photoPng = await extractPhoto(page, pdfjs);

  return { sourceFilename: file.name, fields, photoPng };
}

async function extractFields(page: any): Promise<IdCardFields> {
  const textContent = await page.getTextContent();
  // Build text with newlines so multi-line addresses survive
  const lines: string[] = [];
  let lastY: number | null = null;
  for (const item of textContent.items as Array<{ str: string; transform: number[] }>) {
    const y = item.transform?.[5];
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      lines.push('\n');
    }
    lines.push(item.str);
    lastY = y;
  }
  const flat = lines.join(' ').replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ');

  const grab = (label: string, nextLabels: string[]): string => {
    const stops = nextLabels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const pattern = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*([\\s\\S]*?)(?=\\s*(?:${stops})\\s*:|$)`,
      'i',
    );
    const m = flat.match(pattern);
    if (!m) return '';
    return m[1].replace(/\s+/g, ' ').trim();
  };

  const all = ['Name', 'Center Name', 'Phone No', 'Address', 'Guardians Name', 'Save as PDF', 'Page'];
  return {
    name: grab('Name', all.filter((l) => l !== 'Name')),
    centerName: grab('Center Name', all.filter((l) => l !== 'Center Name')),
    phone: grab('Phone No', all.filter((l) => l !== 'Phone No')),
    address: grab('Address', all.filter((l) => l !== 'Address')),
    guardianName: grab('Guardians Name', all.filter((l) => l !== 'Guardians Name')),
  };
}

interface ImageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box of the printed text on the page, in PDF coordinates
 * (y-origin = bottom). Used to locate the photo by layout. `valid` is false
 * when the page has no usable text so callers fall back to size heuristics. */
interface TextLayout {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  valid: boolean;
}

async function computeTextLayout(page: any): Promise<TextLayout> {
  const tc = await page.getTextContent();
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const it of tc.items as Array<{ str: string; transform: number[]; width?: number; height?: number }>) {
    if (!it.str || !it.str.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const w = it.width ?? 0;
    const h = it.height ?? 8;
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x + w > x1) x1 = x + w;
    if (y + h > y1) y1 = y + h;
  }
  return { x0, y0, x1, y1, valid: Number.isFinite(x0) && x1 > x0 };
}

async function extractPhoto(page: any, pdfjs: any): Promise<Uint8Array | null> {
  // Walk the operator list and collect EVERY painted image with the transform
  // matrix in effect at that moment. The matrix is [a b c d e f]; the drawn
  // size is the length of the (a,b) and (c,d) column vectors, and (e, f) is the
  // origin. Origin in PDF = bottom-left.
  const layout = await computeTextLayout(page);
  const opList = await page.getOperatorList();

  const stack: number[][] = [];
  let ctm: number[] = [1, 0, 0, 1, 0, 0];
  const candidates: ImageBox[] = [];

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    if (fn === pdfjs.OPS.save) {
      stack.push(ctm.slice());
    } else if (fn === pdfjs.OPS.restore) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (fn === pdfjs.OPS.transform) {
      ctm = multiplyMatrix(ctm, args as number[]);
    } else if (
      fn === pdfjs.OPS.paintImageXObject ||
      fn === pdfjs.OPS.paintJpegXObject ||
      fn === pdfjs.OPS.paintInlineImageXObject
    ) {
      // Drawn dimensions on the page (robust to rotation/skew).
      const w = Math.hypot(ctm[0], ctm[1]);
      const h = Math.hypot(ctm[2], ctm[3]);
      const x = ctm[4];
      const y = ctm[5];
      if (w > 20 && h > 20) {
        candidates.push({ x, y, w, h });
      }
    }
  }

  const imageBbox = pickStudentPhoto(candidates, layout);
  if (!imageBbox) return null;

  // Render the full page at high DPI and crop the bbox region.
  const RENDER_SCALE = 3; // ~216 DPI for a 72-DPI source
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Convert PDF bbox → canvas bbox. PDF y-origin is bottom; canvas y is top.
  const cx = imageBbox.x * RENDER_SCALE;
  const cw = imageBbox.w * RENDER_SCALE;
  const ch = imageBbox.h * RENDER_SCALE;
  const cy = canvas.height - (imageBbox.y + imageBbox.h) * RENDER_SCALE;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(1, Math.round(cw));
  cropCanvas.height = Math.max(1, Math.round(ch));
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return null;
  cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cropCanvas.width, cropCanvas.height);

  return await canvasToPng(cropCanvas);
}

/** True when box `a` wraps around box `b` (b's centre lies inside a, and a is
 * meaningfully larger). Used to spot the full-card raster, which encloses the
 * header band; the student photo never encloses the header. */
function encloses(a: ImageBox, b: ImageBox): boolean {
  if (a === b) return false;
  if (a.w * a.h < b.w * b.h * 1.5) return false;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return cx >= a.x && cx <= a.x + a.w && cy >= a.y && cy <= a.y + a.h;
}

/**
 * Among all images on the page, choose the one that is the student photograph.
 *
 * The client can export with any photo (portrait, landscape, square, hi/lo-res)
 * and different exporter versions, so we must NOT key off the photo's own size.
 * The other images on the page are predictable artefacts of the card template:
 *  - the orange header band — very wide (aspect ~5.9);
 *  - the "Save as PDF" button — wide, to the right, outside the card;
 *  - a flattened raster of the *whole card* — landscape (~1.45) and the largest
 *    image, which a naive area ranking would wrongly pick;
 *  - the institute logo — inside the header band, above the text.
 *
 * The one stable invariant is the card *layout*: the photo always sits in the
 * left cell — to the LEFT of the text column and vertically beside the text —
 * whatever its dimensions. So we:
 *   1. drop very wide bands (header / button);
 *   2. drop the card chrome (any image that wraps around a band or the whole
 *      text block);
 *   3. pick the image in the "photo zone" (centre left of the text column and
 *      vertically overlapping the text), which is layout-based and size-proof;
 *   4. fall back to portrait-then-largest when the page has no usable text.
 */
function pickStudentPhoto(candidates: ImageBox[], layout?: TextLayout): ImageBox | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Wide bands (orange header, "Save as PDF" button) are never the photo, but
  // they mark the chrome that wraps around them. The threshold (2.5) sits safely
  // above any real photo — even a landscape one is at most ~1.8 once fitted into
  // the cell — and below the header/button (>4).
  const bands = candidates.filter((c) => c.w / c.h > 2.5);
  const textBox: ImageBox | null =
    layout && layout.valid
      ? { x: layout.x0, y: layout.y0, w: layout.x1 - layout.x0, h: layout.y1 - layout.y0 }
      : null;
  const isCardChrome = (c: ImageBox) =>
    bands.some((b) => encloses(c, b)) || (textBox ? encloses(c, textBox) : false);

  // Keep non-wide images that aren't the full-card raster.
  let pool = candidates.filter((c) => c.w / c.h <= 2.5 && !isCardChrome(c));
  if (pool.length === 0) pool = candidates.filter((c) => c.w / c.h <= 2.5);
  if (pool.length === 0) pool = candidates.slice();

  // Primary: the photo is the image in the left cell — its horizontal centre is
  // left of the text column and it overlaps the text vertically. This holds for
  // any photo size or orientation.
  if (layout && layout.valid) {
    const zone = pool.filter((c) => {
      const centreX = c.x + c.w / 2;
      const overlapsText = c.y < layout.y1 && c.y + c.h > layout.y0;
      return centreX < layout.x0 + 5 && overlapsText;
    });
    if (zone.length > 0) {
      return zone.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
    }
  }

  // Fallback (no text layout / unusual page): prefer a portrait image, else the
  // largest, so we still return something rather than nothing.
  const portraits = pool.filter((c) => c.w / c.h <= 1.1);
  const group = portraits.length > 0 ? portraits : pool;
  return group.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
}

function multiplyMatrix(a: number[], b: number[]): number[] {
  // PDF matrix multiplication (concat): result = b * a (apply b first, then a)
  // For pdfjs OPS.transform args the semantic is "concat" — i.e. CTM := args * CTM
  return [
    b[0] * a[0] + b[1] * a[2],
    b[0] * a[1] + b[1] * a[3],
    b[2] * a[0] + b[3] * a[2],
    b[2] * a[1] + b[3] * a[3],
    b[4] * a[0] + b[5] * a[2] + a[4],
    b[4] * a[1] + b[5] * a[3] + a[5],
  ];
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Could not encode photo as PNG'));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  });
}
