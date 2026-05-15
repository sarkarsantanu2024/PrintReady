/**
 * Lazy TIFF → PNG converter via UTIF. Decodes the first IFD and re-encodes
 * via a canvas to PNG.
 */
interface UtifIFD {
  width: number;
  height: number;
}

interface UtifModule {
  decode(buf: ArrayBuffer): UtifIFD[];
  decodeImage(buf: ArrayBuffer, ifd: UtifIFD): void;
  toRGBA8(ifd: UtifIFD): Uint8Array;
}

export async function convertTiffToPng(file: File): Promise<Blob> {
  const utif = (await import('utif')) as unknown as UtifModule | { default: UtifModule };
  const UTIF = (('default' in utif ? utif.default : utif) as UtifModule);

  const buf = await file.arrayBuffer();
  const ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error('No images found in TIFF.');
  const first = ifds[0];
  UTIF.decodeImage(buf, first);
  const rgba = UTIF.toRGBA8(first);

  const canvas = document.createElement('canvas');
  canvas.width = first.width;
  canvas.height = first.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context for TIFF conversion.');
  const imageData = new ImageData(
    new Uint8ClampedArray(rgba),
    first.width,
    first.height,
  );
  ctx.putImageData(imageData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode PNG'));
    }, 'image/png');
  });
}
