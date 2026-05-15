import Papa from 'papaparse';

export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string>[];
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columns = results.meta.fields ?? [];
        resolve({ columns, rows: results.data });
      },
      error: (err) => reject(err),
    });
  });
}

/** Builds a downloadable CSV template for a given list of column names. */
export function buildCsvTemplate(columns: string[]): Blob {
  const csv = Papa.unparse([Object.fromEntries(columns.map((c) => [c, '']))]);
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

/** Auto-matches CSV columns to template fields by case/space-insensitive name. */
export function autoMatchColumns(
  csvColumns: string[],
  templateFields: string[],
): Record<string, string> {
  const map: Record<string, string> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const csvNorm = csvColumns.map((c) => ({ raw: c, n: norm(c) }));
  for (const tf of templateFields) {
    const tfn = norm(tf);
    const hit = csvNorm.find((c) => c.n === tfn);
    if (hit) map[tf] = hit.raw;
  }
  return map;
}
