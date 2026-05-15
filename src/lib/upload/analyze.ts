import { ptToMm } from '@/lib/pdf/units';
import { convertHeicToPng } from './convert-heic';
import { convertTiffToPng } from './convert-tiff';
import type { AnalyzedFile, ColorSpace, DetectedFormat } from './types';

function detectFormat(file: File): DetectedFormat {
  const name = file.name.toLowerCase();
  const t = file.type.toLowerCase();
  if (t === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (t === 'image/png' || name.endsWith('.png')) return 'png';
  if (t === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg';
  if (t === 'image/webp' || name.endsWith('.webp')) return 'webp';
  if (t === 'image/svg+xml' || name.endsWith('.svg')) return 'svg';
  if (t === 'image/tiff' || name.endsWith('.tif') || name.endsWith('.tiff')) return 'tiff';
  if (t === 'image/heic' || t === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif'))
    return 'heic';
  throw new Error(`Unsupported file type: ${file.type || file.name}`);
}

function blobToPngBytes(blob: Blob): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (out) => {
        URL.revokeObjectURL(url);
        if (!out) {
          reject(new Error('Could not encode PNG'));
          return;
        }
        const bytes = new Uint8Array(await out.arrayBuffer());
        resolve({ bytes, w, h });
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    img.src = url;
  });
}

async function analyzePdf(file: File): Promise<AnalyzedFile> {
  // Lazy-load pdfjs only when a PDF is uploaded.
  const pdfjs = await import('pdfjs-dist');
  // Use the bundled worker so we don't need to ship a separate file.
  const workerModule = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')) as {
    default: string;
  };
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const widthMm = ptToMm(viewport.width);
  const heightMm = ptToMm(viewport.height);
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait';

  return {
    file,
    format: 'pdf',
    widthMm,
    heightMm,
    pixelWidth: 0,
    pixelHeight: 0,
    dpi: 0, // vector → DPI is not meaningful at the source
    colorSpace: 'unknown',
    orientation,
    pageCount: doc.numPages,
    embedBytes: new Uint8Array(buf),
    embedKind: 'pdf',
  };
}

async function analyzeImage(file: File, format: DetectedFormat): Promise<AnalyzedFile> {
  // Convert formats that pdf-lib can't directly embed (webp/heic/tiff/svg) to PNG first.
  let pngSource: Blob = file;
  let convertedToPng = false;

  if (format === 'heic') {
    pngSource = await convertHeicToPng(file);
    convertedToPng = true;
  } else if (format === 'tiff') {
    pngSource = await convertTiffToPng(file);
    convertedToPng = true;
  } else if (format === 'webp') {
    convertedToPng = true; // we'll round-trip via canvas below
  } else if (format === 'svg') {
    convertedToPng = true; // rasterise via canvas
  }

  const decoded = await blobToPngBytes(pngSource);

  // Print size: we trust the user to have authored at print scale, defaulting
  // to ~300 DPI assumption. We expose the dimensions in mm at 300 DPI.
  const assumedDpi = 300;
  const widthMm = (decoded.w / assumedDpi) * 25.4;
  const heightMm = (decoded.h / assumedDpi) * 25.4;
  const dpi = (decoded.w / (widthMm / 25.4)) * 1; // self-consistent → assumedDpi
  const orientation = decoded.w >= decoded.h ? 'landscape' : 'portrait';

  // Rough colour-space heuristic: sample a few pixels.
  const colorSpace = await detectColorSpace(pngSource);

  let embedKind: 'png' | 'jpg' = 'png';
  let embedBytes = decoded.bytes;
  if (format === 'jpg' && !convertedToPng) {
    embedKind = 'jpg';
    embedBytes = new Uint8Array(await file.arrayBuffer());
  } else if (format === 'png' && !convertedToPng) {
    embedKind = 'png';
    embedBytes = new Uint8Array(await file.arrayBuffer());
  }

  return {
    file,
    format,
    widthMm,
    heightMm,
    pixelWidth: decoded.w,
    pixelHeight: decoded.h,
    dpi,
    colorSpace,
    orientation,
    embedBytes,
    embedKind,
  };
}

async function detectColorSpace(blob: Blob): Promise<ColorSpace> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = Math.min(img.naturalWidth, 64);
      const h = Math.min(img.naturalHeight, 64);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve('unknown');
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let isGrayscale = true;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2]) {
          isGrayscale = false;
          break;
        }
      }
      URL.revokeObjectURL(url);
      resolve(isGrayscale ? 'grayscale' : 'rgb');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('unknown');
    };
    img.src = url;
  });
}

/**
 * Inspects an uploaded file and returns its dimensions, DPI, format, etc.
 * Throws on unsupported formats.
 */
export async function analyzeFile(file: File): Promise<AnalyzedFile> {
  const format = detectFormat(file);
  if (format === 'pdf') return analyzePdf(file);
  return analyzeImage(file, format);
}
