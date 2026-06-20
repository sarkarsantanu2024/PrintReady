import type { ExtractedIdCard, IdCardFields, PhotoSource } from './types';

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
  const { photoPng, photoSource } = await extractPhoto(page, pdfjs);

  return { sourceFilename: file.name, fields, photoPng, photoSource };
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

async function computeTextLayout(page: any, clip?: ImageBox | null): Promise<TextLayout> {
  // When `clip` is given, only text whose origin falls inside that box counts.
  // The card is flattened into a single raster, but the surrounding page also
  // carries a "Page 1 of 1" footer and a "Save as PDF" button — restricting to
  // the card's bounds keeps those out, so x0/y range describe the card text only.
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
    if (clip) {
      const m = 5;
      if (x < clip.x - m || x > clip.x + clip.w + m || y < clip.y - m || y > clip.y + clip.h + m) {
        continue;
      }
    }
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x + w > x1) x1 = x + w;
    if (y + h > y1) y1 = y + h;
  }
  return { x0, y0, x1, y1, valid: Number.isFinite(x0) && x1 > x0 };
}

/** The flattened card raster: the largest image that wraps around the header
 * band. When present, the student photo is a sub-region of THIS image (the card
 * is a single picture), not a separate image — so we crop a cell out of it. */
function findCardRaster(candidates: ImageBox[], bands: ImageBox[]): ImageBox | null {
  const enclosing = candidates.filter((c) => bands.some((b) => encloses(c, b)));
  if (enclosing.length === 0) return null;
  return enclosing.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
}

async function extractPhoto(
  page: any,
  pdfjs: any,
): Promise<{ photoPng: Uint8Array | null; photoSource: PhotoSource }> {
  // Walk the operator list and collect EVERY painted image with the transform
  // matrix in effect at that moment. The matrix is [a b c d e f]; the drawn
  // size is the length of the (a,b) and (c,d) column vectors, and (e, f) is the
  // origin. Origin in PDF = bottom-left.
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
    } else if (fn === pdfjs.OPS.paintFormXObjectBegin) {
      // A form XObject brackets nested content and applies its own matrix.
      // pdf.js does save() + transform(matrix) on Begin and restore() on End,
      // so we must mirror that or every image inside a form lands at the wrong
      // page position (common in browser "Save as PDF" exports).
      stack.push(ctm.slice());
      const matrix = (args as unknown[] | undefined)?.[0] as number[] | null | undefined;
      if (matrix && matrix.length === 6) ctm = multiplyMatrix(ctm, matrix);
    } else if (fn === pdfjs.OPS.paintFormXObjectEnd) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (
      fn === pdfjs.OPS.paintImageXObject ||
      fn === pdfjs.OPS.paintImageXObjectRepeat ||
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

  // Detect the flattened card raster, then read the card's text WITHIN it so the
  // footer / "Save as PDF" chrome can't pollute the photo-cell geometry.
  const bands = candidates.filter((c) => c.w / c.h > 2.5);
  const cardRaster = findCardRaster(candidates, bands);
  const layout = await computeTextLayout(page, cardRaster);

  const { region, source } = pickPhotoRegion(candidates, layout, cardRaster, bands);
  if (!region) return { photoPng: null, photoSource: 'none' };

  // Render the full page at high DPI and crop the region.
  const RENDER_SCALE = 3; // ~216 DPI for a 72-DPI source
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { photoPng: null, photoSource: source };
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Convert PDF bbox → canvas bbox. PDF y-origin is bottom; canvas y is top.
  // Clamp to the canvas so a derived region can never read outside it.
  const cx = clamp(region.x * RENDER_SCALE, 0, canvas.width);
  const cyTop = clamp(canvas.height - (region.y + region.h) * RENDER_SCALE, 0, canvas.height);
  const cw = clamp(region.w * RENDER_SCALE, 1, canvas.width - cx);
  const ch = clamp(region.h * RENDER_SCALE, 1, canvas.height - cyTop);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(1, Math.round(cw));
  cropCanvas.height = Math.max(1, Math.round(ch));
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return { photoPng: null, photoSource: source };
  cropCtx.drawImage(canvas, cx, cyTop, cw, ch, 0, 0, cropCanvas.width, cropCanvas.height);

  // Progressive enhancement: if the browser exposes the Shape Detection API,
  // tighten the crop to the detected face so landscape/square photos still
  // yield a head-and-shoulders portrait rather than a wide strip. No-ops (and
  // returns the layout crop unchanged) when unavailable or no face is found.
  const tightened = await tightenToFace(cropCanvas);

  return { photoPng: await canvasToPng(tightened), photoSource: source };
}

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}

/** Re-crop a rendered photo region to the face, when a face is confidently
 * detected and there is meaningful surrounding context to trim. Uses the native
 * FaceDetector (Chromium) if present; otherwise returns the input untouched. */
async function tightenToFace(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const FD = (globalThis as Record<string, unknown>).FaceDetector as
    | (new (opts: { maxDetectedFaces: number; fastMode: boolean }) => {
        detect: (
          source: CanvasImageSource,
        ) => Promise<Array<{ boundingBox: { x: number; y: number; width: number; height: number } }>>;
      })
    | undefined;
  if (typeof FD !== 'function') return canvas;
  try {
    const detector = new FD({ maxDetectedFaces: 1, fastMode: false });
    const faces = await detector.detect(canvas);
    if (!faces || faces.length === 0) return canvas;
    const box = faces[0].boundingBox as { x: number; y: number; width: number; height: number };
    if (!box || box.width < 10 || box.height < 10) return canvas;

    // Only tighten when the face is a small part of the crop (i.e. the crop
    // really does contain extra card/background). If it already fills the frame
    // the layout crop is fine and re-cropping risks clipping the head.
    const faceArea = box.width * box.height;
    if (faceArea > canvas.width * canvas.height * 0.55) return canvas;

    // Expand the tight face box into a head-and-shoulders portrait: generous
    // margins (more above for hair/forehead, more below for shoulders).
    const padX = box.width * 0.6;
    const padTop = box.height * 0.8;
    const padBottom = box.height * 1.0;
    const x0 = clamp(box.x - padX, 0, canvas.width);
    const y0 = clamp(box.y - padTop, 0, canvas.height);
    const x1 = clamp(box.x + box.width + padX, 0, canvas.width);
    const y1 = clamp(box.y + box.height + padBottom, 0, canvas.height);
    const w = x1 - x0;
    const h = y1 - y0;
    if (w < 10 || h < 10) return canvas;

    const out = document.createElement('canvas');
    out.width = Math.round(w);
    out.height = Math.round(h);
    const octx = out.getContext('2d');
    if (!octx) return canvas;
    octx.drawImage(canvas, x0, y0, w, h, 0, 0, out.width, out.height);
    return out;
  } catch {
    return canvas;
  }
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
 * Choose the page region (in PDF coords) that holds the student photograph.
 *
 * The client can export with any photo (portrait, landscape, square, hi/lo-res),
 * any exporter version, and — crucially — the card may be flattened so the photo
 * is NOT a separate image at all. So we must not key off the photo's own size,
 * and we must cope with there being no distinct photo image. The one stable
 * invariant is the card *layout*: the photo always sits in the left cell — to
 * the LEFT of the text column and vertically beside the text — whatever its
 * form or dimensions.
 *
 * Strategy, in order of confidence:
 *   1. A separate photo image overlaid in the left cell — its centre is left of
 *      the text column AND vertically beside the text ROWS (not above them, which
 *      is where the header logo sits). Crop that exact image, any orientation.
 *   2. Flattened card (the real-world case): the whole card is one raster and the
 *      photo is a sub-region of it. Derive the photo cell from the card+text
 *      geometry — between the card's left edge and the text column, spanning the
 *      text rows, capped below the header band — and crop it. Size/format-proof.
 *   3. No card raster / no usable text: fall back to a portrait-then-largest
 *      image so we still return something rather than nothing.
 *
 * `layout` here is the text measured INSIDE the card raster, so its x0 is the
 * true left edge of the text column and its y-range covers only the card rows —
 * the footer and "Save as PDF" button are already excluded.
 */
function pickPhotoRegion(
  candidates: ImageBox[],
  layout: TextLayout,
  cardRaster: ImageBox | null,
  bands: ImageBox[],
): { region: ImageBox | null; source: PhotoSource } {
  // (1) A distinct photo image sitting in the left cell, BESIDE the text rows.
  // The header logo also lies left of the text column, but its vertical centre
  // is ABOVE the rows (in the header), so the "beside" test rejects it.
  if (layout.valid) {
    const beside = candidates.filter((c) => {
      if (c === cardRaster || bands.includes(c)) return false;
      if (c.w / c.h > 2.5) return false;
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      const leftOfText = cx < layout.x0;
      const besideRows = cy > layout.y0 - 3 && cy < layout.y1 + 3;
      return leftOfText && besideRows;
    });
    if (beside.length > 0) {
      return { region: beside.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b)), source: 'embedded' };
    }
  }

  // (2) Flattened card — carve the photo cell out of the card raster.
  if (cardRaster && layout.valid) {
    const rows = layout.y1 - layout.y0;
    const left = cardRaster.x + 2;
    const right = layout.x0 - 4; // just left of the text column
    // Header band's bottom edge (a band that sits above the text rows) caps the
    // top so we never crop into the orange header / its logo.
    const headerBottom = bands
      .filter((b) => b.y > layout.y1 - 2)
      .reduce((min, b) => Math.min(min, b.y), Infinity);
    const headroom = rows * 0.18;
    let top = layout.y1 + headroom; // a little above the first row for hair
    if (Number.isFinite(headerBottom)) top = Math.min(top, headerBottom - 1);
    const bottom = Math.max(cardRaster.y, layout.y0 - headroom * 0.5);
    const w = right - left;
    const h = top - bottom;
    if (w > 10 && h > 10) {
      return { region: { x: left, y: bottom, w, h }, source: 'card-raster' };
    }
  }

  if (candidates.length === 0) return { region: null, source: 'none' };

  // (3) No card raster / no usable text: prefer a portrait image, else largest.
  const pool = candidates.filter((c) => c.w / c.h <= 2.5 && c !== cardRaster);
  const group = pool.length > 0 ? pool : candidates;
  const portraits = group.filter((c) => c.w / c.h <= 1.1);
  const finalGroup = portraits.length > 0 ? portraits : group;
  return { region: finalGroup.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b)), source: 'fallback' };
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
