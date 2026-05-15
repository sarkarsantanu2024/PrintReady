declare module 'utif' {
  interface UtifIFD {
    width: number;
    height: number;
  }
  export function decode(buf: ArrayBuffer): UtifIFD[];
  export function decodeImage(buf: ArrayBuffer, ifd: UtifIFD): void;
  export function toRGBA8(ifd: UtifIFD): Uint8Array;
}

declare module 'heic2any' {
  interface Heic2AnyOptions {
    blob: Blob;
    toType?: string;
    quality?: number;
  }
  function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>;
  export default heic2any;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const src: string;
  export default src;
}
