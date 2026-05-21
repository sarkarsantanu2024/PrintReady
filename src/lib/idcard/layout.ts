import type { Orientation, SheetSize } from '@/lib/pdf/units';

export interface IdCardHeader {
  /** PNG bytes of an optional logo. */
  logoPng: Uint8Array | null;
  /** Data URL — used for the on-screen preview only (not embedded). */
  logoDataUrl: string | null;
  companyName: string;
  tagline: string;
  website: string;
  /** Background colour of the header strip (hex, "#rrggbb"). */
  bgColor: string;
  textColor: string;
  /** Header height in mm. */
  heightMm: number;
}

export interface IdCardLayout {
  // Sheet
  pageSize: SheetSize;
  orientation: Orientation;
  sheetMarginMm: number;
  gapMm: number;
  bleedMm: number;

  // Card
  cardWidthMm: number;
  cardHeightMm: number;
  cardBgColor: string;
  cardBorderColor: string;

  // Photo
  photoWidthMm: number;
  photoHeightMm: number;
  photoPadMm: number;

  // Typography
  labelSize: number;
  valueSize: number;
  nameSize: number;
  labelColor: string;
  valueColor: string;

  // Header
  header: IdCardHeader;
}

// Fixed dimensions — 2 × 4 = 8 cards fill an A4 portrait sheet with a thin
// 5 mm outer margin and no gap between cards. Card body 100 × 71.5 mm.
// (Larger than CR80 but standard for Indian school / institute ID printing
// where the sheet is cut into 8 cards.)
export const DEFAULT_LAYOUT: IdCardLayout = {
  pageSize: 'A4',
  orientation: 'portrait',
  sheetMarginMm: 5,
  gapMm: 0,
  bleedMm: 0,

  cardWidthMm: 100,
  cardHeightMm: 71.5,
  cardBgColor: '#ffffff',
  cardBorderColor: '#c9ced3',

  photoWidthMm: 30,
  photoHeightMm: 38,
  photoPadMm: 4,

  labelSize: 7,
  valueSize: 9,
  nameSize: 11,
  labelColor: '#6c7680',
  valueColor: '#1a1f26',

  header: {
    logoPng: null,
    logoDataUrl: null,
    companyName: 'MIND MANTRA ABACUS',
    tagline: 'An ISO 9001:2015 Certified Company',
    website: 'www.mindmantraabacus.com',
    bgColor: '#e87d2e',
    textColor: '#ffffff',
    heightMm: 15,
  },
};

export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}
