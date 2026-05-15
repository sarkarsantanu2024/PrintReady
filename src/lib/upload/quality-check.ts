import type { AnalyzedFile } from './types';

export type WarningLevel = 'good' | 'warning' | 'caution' | 'info';

export interface QualityNote {
  level: WarningLevel;
  message: string;
}

/** Inspects an analysed file and returns a list of quality notes for the UI. */
export function qualityCheck(file: AnalyzedFile): QualityNote[] {
  const notes: QualityNote[] = [];

  if (file.format === 'pdf') {
    notes.push({
      level: 'good',
      message: 'Vector PDF — sharp at any size.',
    });
    if ((file.pageCount ?? 1) > 1) {
      notes.push({
        level: 'info',
        message: `${file.pageCount} pages detected. Only the first page will be used.`,
      });
    }
  } else {
    if (file.dpi >= 300) {
      notes.push({ level: 'good', message: `Resolution good — ${Math.round(file.dpi)} DPI at chosen size.` });
    } else if (file.dpi >= 200) {
      notes.push({
        level: 'warning',
        message: `Resolution borderline — ${Math.round(file.dpi)} DPI. Recommend at least 300 DPI for sharp print.`,
      });
    } else {
      notes.push({
        level: 'caution',
        message: `Resolution low — ${Math.round(file.dpi)} DPI. Print may look soft. Re-export at 300 DPI minimum.`,
      });
    }
  }

  if (file.colorSpace === 'rgb') {
    notes.push({
      level: 'info',
      message: 'RGB colour space — output will be RGB. For Pantone matching, contact your printer.',
    });
  } else if (file.colorSpace === 'grayscale') {
    notes.push({
      level: 'info',
      message: 'Grayscale source detected — black-only output works best for cost-saving.',
    });
  }

  if (file.format !== 'pdf' && file.format !== 'svg') {
    notes.push({
      level: 'caution',
      message:
        'No bleed detected in source — your design will print exactly as uploaded. Add 3 mm bleed in your design app for safer cuts.',
    });
  }

  return notes;
}
