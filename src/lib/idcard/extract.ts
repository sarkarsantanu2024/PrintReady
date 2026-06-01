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

async function extractPhoto(page: any, pdfjs: any): Promise<Uint8Array | null> {
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

  const imageBbox = pickStudentPhoto(candidates);
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

/**
 * Among all images on the page, choose the one that is the student photograph.
 *
 * On these cards the page also contains the institute logo (small, roughly
 * square) and the orange header band (very wide, landscape) — neither is the
 * photo. A passport-style student photo is always *portrait* (taller than wide)
 * and the largest such image. So we reject wide bands, favour portrait images,
 * and break ties by drawn area.
 */
function pickStudentPhoto(candidates: ImageBox[]): ImageBox | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  let best: ImageBox | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const aspect = c.w / c.h; // < 1 = portrait, > 1 = landscape
    // Skip the header band and other clearly-landscape artwork.
    if (aspect > 1.6) continue;
    // Portrait images (the photo) score on full area; squarish/landscape
    // images (logos) are penalised so a large photo always wins.
    const portraitWeight = aspect <= 1.1 ? 1 : 0.35;
    const score = c.w * c.h * portraitWeight;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  // If every image looked like a band (none passed the filter), fall back to
  // the largest image so we still return something rather than nothing.
  if (!best) {
    best = candidates.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
  }
  return best;
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
