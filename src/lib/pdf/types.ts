import type { SheetSize, Orientation } from './units';

export type CropMarkStyle = 'corner' | 'full-bleed' | 'japanese';
export type FoldMarkStyle = 'bi' | 'tri' | 'name-tent' | 'none';
export type Bleed = 0 | 3 | 5;

export interface GridLayout {
  cols: number;
  rows: number;
  /** Final card width in mm (without bleed). */
  cardWidth: number;
  /** Final card height in mm. */
  cardHeight: number;
  /** Gap between adjacent cards in mm. */
  gap: number;
}

export interface PrintOptions {
  pageSize: SheetSize;
  orientation: Orientation;
  bleed?: Bleed;
  cropMarks?: boolean;
  cropMarkStyle?: CropMarkStyle;
  foldMarks?: FoldMarkStyle;
  registrationMarks?: boolean;
  colorBars?: boolean;
  watermark?: string | null;
  /** 1.0 = 100% scale (default). Anything else is "custom" and discouraged. */
  scale?: number;
  gridLayout?: GridLayout;
}

export const DEFAULT_PRINT_OPTIONS: Required<
  Pick<
    PrintOptions,
    | 'bleed'
    | 'cropMarks'
    | 'cropMarkStyle'
    | 'foldMarks'
    | 'registrationMarks'
    | 'colorBars'
    | 'scale'
  >
> = {
  bleed: 3,
  cropMarks: true,
  cropMarkStyle: 'corner',
  foldMarks: 'none',
  registrationMarks: false,
  colorBars: false,
  scale: 1,
};
