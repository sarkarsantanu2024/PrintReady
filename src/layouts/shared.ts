/**
 * Helpers used by all 3 react-pdf layouts.
 */
const PT_PER_MM = 2.834645669;

/** Convert mm → points for react-pdf style props. */
export const CARD_PT = (mm: number): number => mm * PT_PER_MM;

/** Splits a flat array of records into N-per-sheet chunks. */
export function makeRows<T>(rows: T[], perSheet: number): T[][] {
  if (perSheet <= 0) return [rows];
  const sheets: T[][] = [];
  for (let i = 0; i < rows.length; i += perSheet) {
    sheets.push(rows.slice(i, i + perSheet));
  }
  return sheets.length ? sheets : [[]];
}
