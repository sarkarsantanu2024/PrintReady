// Encode a logo image into src/lib/idcard/defaultLogo.ts as a base64 data URL,
// so it ships as the permanent default card-header logo (no manual upload).
//
// Usage: node scripts/encode-logo.mjs public/mma-logo.png
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

const src = process.argv[2] || 'public/mma-logo.png';
const mime =
  { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[
    extname(src).toLowerCase()
  ] || 'image/png';

const bytes = await readFile(src);
const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;

const out = `/**
 * Permanent client logo (MIND MANTRA ABACUS), baked into the app so it never
 * needs to be uploaded manually. Regenerate with:
 *   node scripts/encode-logo.mjs ${src}
 */
export const DEFAULT_LOGO_DATA_URL: string | null =
  '${dataUrl}';
`;

await writeFile('src/lib/idcard/defaultLogo.ts', out);
console.log(`Embedded ${src} (${bytes.length} bytes) → src/lib/idcard/defaultLogo.ts`);
