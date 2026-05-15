import { z } from 'zod';
import type { LayoutDefinition, LayoutMeta } from '../types';

export const idCardMeta: LayoutMeta = {
  kind: 'id_card',
  label: 'ID Card',
  widthMm: 85.6,
  heightMm: 54,
  perA4: 8,
  defaultSheet: 'A4',
  defaultOrientation: 'portrait',
};

export const idCardSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  designation: z.string().min(1, 'Designation is required'),
  id_number: z.string().min(1, 'ID number is required'),
  department: z.string().optional().default(''),
  blood_group: z.string().optional().default(''),
  valid_until: z.string().optional().default(''),
  qr_data: z.string().optional().default(''),
  org_name: z.string().optional().default(''),
  org_logo: z.string().optional().default(''),
  photo: z.string().optional().default(''),
});

export type IdCardData = z.infer<typeof idCardSchema>;

export const idCardDefaults: IdCardData = {
  full_name: '',
  designation: '',
  id_number: '',
  department: '',
  blood_group: '',
  valid_until: '',
  qr_data: '',
  org_name: '',
  org_logo: '',
  photo: '',
};

export const idCardDefinition: LayoutDefinition<typeof idCardSchema> = {
  meta: idCardMeta,
  schema: idCardSchema,
  defaults: idCardDefaults,
};
