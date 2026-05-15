import { pdf } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { IdCardSheet } from '@/layouts/id-card/pdf';
import { BusinessCardSheet } from '@/layouts/business-card/pdf';
import { CertificateDocument } from '@/layouts/certificate/pdf';
import type { IdCardData } from '@/layouts/id-card/schema';
import type { BusinessCardData } from '@/layouts/business-card/schema';
import type { CertificateData } from '@/layouts/certificate/schema';
import type { LayoutKind } from '@/layouts/types';

/**
 * Renders the chosen layout's react-pdf document to a Blob.
 * For ID/Business cards, a single-entry editor passes [data] and gets one A4 sheet.
 * Bulk CSV passes the full row list and gets multiple sheets.
 */
export async function renderLayoutToBlob(
  kind: LayoutKind,
  rows: unknown[],
  perSheet?: number,
): Promise<Blob> {
  let element: ReactElement;
  switch (kind) {
    case 'id_card':
      element = IdCardSheet({ rows: rows as IdCardData[], perSheet });
      break;
    case 'business_card':
      element = BusinessCardSheet({ rows: rows as BusinessCardData[], perSheet });
      break;
    case 'certificate':
      element = CertificateDocument({ rows: rows as CertificateData[] });
      break;
  }
  return await pdf(element).toBlob();
}
