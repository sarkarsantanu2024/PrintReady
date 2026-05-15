/**
 * Lazy HEIC → PNG converter. Loaded on-demand so the heic2any payload is not
 * bundled with the main app shell.
 */
export async function convertHeicToPng(file: File): Promise<Blob> {
  const heic2anyModule = await import('heic2any');
  const heic2any = (heic2anyModule.default ?? heic2anyModule) as (opts: {
    blob: Blob;
    toType?: string;
    quality?: number;
  }) => Promise<Blob | Blob[]>;

  const result = await heic2any({ blob: file, toType: 'image/png' });
  return Array.isArray(result) ? result[0] : result;
}
