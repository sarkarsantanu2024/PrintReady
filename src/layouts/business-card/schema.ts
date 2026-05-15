import { z } from 'zod';
import type { LayoutDefinition, LayoutMeta } from '../types';

export const businessCardMeta: LayoutMeta = {
  kind: 'business_card',
  label: 'Business Card',
  widthMm: 89,
  heightMm: 54,
  perA4: 10,
  defaultSheet: 'A4',
  defaultOrientation: 'portrait',
};

export const businessCardSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  title: z.string().optional().default(''),
  company: z.string().min(1, 'Company is required'),
  email: z.string().email('Enter a valid email').or(z.literal('')).default(''),
  phone: z.string().optional().default(''),
  website: z.string().optional().default(''),
  address: z.string().optional().default(''),
  logo: z.string().optional().default(''),
  qr_enabled: z.boolean().default(true),
});

export type BusinessCardData = z.infer<typeof businessCardSchema>;

export const businessCardDefaults: BusinessCardData = {
  full_name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  logo: '',
  qr_enabled: true,
};

export const businessCardDefinition: LayoutDefinition<typeof businessCardSchema> = {
  meta: businessCardMeta,
  schema: businessCardSchema,
  defaults: businessCardDefaults,
};

/** Builds a vCard 3.0 string for QR encoding. */
export function buildVCard(d: BusinessCardData): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${d.full_name}`,
    d.title && `TITLE:${d.title}`,
    d.company && `ORG:${d.company}`,
    d.email && `EMAIL:${d.email}`,
    d.phone && `TEL:${d.phone}`,
    d.website && `URL:${d.website}`,
    d.address && `ADR:;;${d.address.replace(/\n/g, ' ')};;;;`,
    'END:VCARD',
  ].filter(Boolean);
  return lines.join('\n');
}
