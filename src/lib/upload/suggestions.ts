import { sheetDimensionsPt, type SheetSize } from '@/lib/pdf/units';
import { suggestGrid } from '@/lib/pdf/grid-layout';
import type { AnalyzedFile } from './types';

export interface Suggestion {
  /** Human-readable headline shown in the UI. */
  title: string;
  /** Subtext / hint. */
  description: string;
  /** Recommended config to apply when the user accepts. */
  apply: {
    pageSize: SheetSize;
    orientation: 'portrait' | 'landscape';
    grid?: { cols: number; rows: number };
    foldMarks?: 'bi' | 'tri' | 'name-tent' | 'none';
  };
}

/** Tolerance in mm when comparing detected size to a known preset. */
const TOL = 2;
const within = (v: number, target: number, tol = TOL) => Math.abs(v - target) <= tol;

/**
 * Generates layout suggestions for an uploaded design.
 *
 * Always returns at least one suggestion when the design is smaller than the
 * sheet, falling back to an auto-calculated grid if no named preset matches.
 * This is what makes "any size card → multi-up sheet with crop marks" work
 * out of the box.
 */
export function suggestionsFor(
  file: AnalyzedFile,
  sheet: SheetSize = 'A4',
): Suggestion[] {
  const out: Suggestion[] = [];

  const w = Math.min(file.widthMm, file.heightMm); // shorter side
  const h = Math.max(file.widthMm, file.heightMm); // longer side

  // ---------- Named presets (friendly labels) ----------

  // CR80 / ID card
  if (within(w, 54) && within(h, 85.6)) {
    out.push({
      title: 'Looks like an ID card / CR80',
      description: '8 per A4 (2 × 4) with crop marks.',
      apply: { pageSize: 'A4', orientation: 'portrait', grid: { cols: 2, rows: 4 } },
    });
  }

  // Standard business card 89×54mm
  if (within(w, 54) && within(h, 89)) {
    out.push({
      title: 'Standard business card',
      description: '10 per A4 (2 × 5) with crop marks.',
      apply: { pageSize: 'A4', orientation: 'portrait', grid: { cols: 2, rows: 5 } },
    });
  }

  // A4 single page
  if (within(w, 210) && within(h, 297)) {
    out.push({
      title: 'A4 portrait',
      description: 'Single page with crop marks.',
      apply: { pageSize: 'A4', orientation: file.orientation },
    });
  }

  // A5 leaflet
  if (within(w, 148) && within(h, 210)) {
    out.push({
      title: 'A5 leaflet',
      description: '2 per A4 sheet.',
      apply: { pageSize: 'A4', orientation: 'portrait', grid: { cols: 1, rows: 2 } },
    });
  }

  // Event ticket 200×80
  if (within(w, 80) && within(h, 200)) {
    out.push({
      title: 'Event ticket',
      description: '3 per A4 sheet (1 × 3) with optional tear strip.',
      apply: { pageSize: 'A4', orientation: 'portrait', grid: { cols: 1, rows: 3 } },
    });
  }

  // Tri-fold A4 leaflet
  if (within(w, 99) && within(h, 210)) {
    out.push({
      title: 'Tri-fold A4 leaflet',
      description: 'Single panel with fold guides.',
      apply: { pageSize: 'A4', orientation: 'landscape', foldMarks: 'tri' },
    });
  }

  // Postcard A6
  if (within(w, 105) && within(h, 148)) {
    out.push({
      title: 'A6 postcard',
      description: '4 per A4 (2 × 2) with crop marks.',
      apply: { pageSize: 'A4', orientation: 'portrait', grid: { cols: 2, rows: 2 } },
    });
  }

  // ---------- Always-on auto-fit fallback ----------
  // Calculates the densest grid that fits on the chosen sheet (and on the
  // rotated sheet) and surfaces whichever wins, so any card-shaped upload
  // produces a multi-up layout out of the box.

  for (const orientation of ['portrait', 'landscape'] as const) {
    const sheetDims = sheetDimensionsPt(sheet, orientation);
    const fit = suggestGrid(sheetDims.w, sheetDims.h, file.widthMm, file.heightMm, 5);
    if (fit.perSheet > 1) {
      const label =
        orientation === 'portrait'
          ? `${fit.perSheet} per ${sheet}`
          : `${fit.perSheet} per ${sheet} (landscape)`;
      // Skip duplicates of presets we already added with the same grid
      const dup = out.some(
        (s) =>
          s.apply.grid?.cols === fit.cols &&
          s.apply.grid?.rows === fit.rows &&
          s.apply.orientation === orientation,
      );
      if (!dup) {
        out.push({
          title: `Auto-fit · ${label}`,
          description: `${fit.cols} × ${fit.rows} grid with crop marks between cards.`,
          apply: { pageSize: sheet, orientation, grid: { cols: fit.cols, rows: fit.rows } },
        });
      }
    }
  }

  // If the source is bigger than the sheet (or a single-page A4 doc), at minimum
  // surface a "single piece centered" suggestion so the action feels deliberate.
  if (out.length === 0) {
    out.push({
      title: 'Single piece centered',
      description: 'Place once at the center of the sheet with crop marks.',
      apply: { pageSize: sheet, orientation: file.orientation },
    });
  }

  return out;
}
