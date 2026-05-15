export type DetectedFormat = 'pdf' | 'png' | 'jpg' | 'webp' | 'svg' | 'tiff' | 'heic';

export type ColorSpace = 'rgb' | 'grayscale' | 'unknown';

export interface AnalyzedFile {
  /** Original input file (kept around to read again if needed). */
  file: File;
  /** Normalized format key. */
  format: DetectedFormat;
  /** Width in millimetres at 100% scale. */
  widthMm: number;
  /** Height in millimetres at 100% scale. */
  heightMm: number;
  /** Pixel width (for raster) or 0 (for vector / pdf). */
  pixelWidth: number;
  /** Pixel height. */
  pixelHeight: number;
  /** DPI calculated from pixel dimensions and final print size. 0 if unknown / vector. */
  dpi: number;
  /** Colour space, when detectable. */
  colorSpace: ColorSpace;
  /** Portrait or landscape. */
  orientation: 'portrait' | 'landscape';
  /** PDF page count, when applicable. */
  pageCount?: number;
  /**
   * Bytes ready to embed in the output PDF. Always normalised:
   *   pdf  → original PDF bytes
   *   svg  → rasterised PNG bytes
   *   png  → original PNG bytes
   *   jpg  → original JPEG bytes
   *   webp → converted PNG bytes
   *   tiff → converted PNG bytes
   *   heic → converted PNG bytes
   */
  embedBytes: Uint8Array;
  /** What kind of bytes `embedBytes` actually is. */
  embedKind: 'pdf' | 'png' | 'jpg';
}
