export interface IdCardFields {
  name: string;
  centerName: string;
  phone: string;
  address: string;
  guardianName: string;
}

export interface ExtractedIdCard {
  /** Original filename for traceability. */
  sourceFilename: string;
  fields: IdCardFields;
  /** PNG bytes of the cropped photo, or null if no embedded image was found. */
  photoPng: Uint8Array | null;
}
