export interface IdCardFields {
  name: string;
  centerName: string;
  phone: string;
  address: string;
  guardianName: string;
}

/**
 * How the photo was obtained, used to flag "irregular" PDFs:
 *  - `embedded`    — a clean, separate photo image (the standard/regular PDF).
 *  - `card-raster` — the card was flattened to one image; we carved the photo
 *                    sub-region out of it (browser "Save as PDF" / scanned card).
 *  - `fallback`    — no card layout; we guessed the largest/portrait image.
 *  - `none`        — no photo could be located.
 */
export type PhotoSource = 'embedded' | 'card-raster' | 'fallback' | 'none';

export interface ExtractedIdCard {
  /** Original filename for traceability. */
  sourceFilename: string;
  fields: IdCardFields;
  /** PNG bytes of the cropped photo, or null if no embedded image was found. */
  photoPng: Uint8Array | null;
  /** Where the photo came from — drives the "irregular format" upload advisory. */
  photoSource: PhotoSource;
}
