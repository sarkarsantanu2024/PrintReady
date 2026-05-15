import { z } from 'zod';
import type { LayoutDefinition, LayoutMeta } from '../types';

export const certificateMeta: LayoutMeta = {
  kind: 'certificate',
  label: 'Certificate',
  widthMm: 297,
  heightMm: 210,
  perA4: 1,
  defaultSheet: 'A4',
  defaultOrientation: 'landscape',
};

export const DEFAULT_BODY =
  'has successfully completed the requirements and is hereby awarded this certificate in recognition of their achievement.';

export const certificateSchema = z.object({
  recipient_name: z.string().min(1, 'Recipient name is required'),
  course_title: z.string().min(1, 'Course/award title is required'),
  organization: z.string().min(1, 'Organisation is required'),
  issued_date: z.string().optional().default(''),
  signatory_name: z.string().optional().default(''),
  signatory_title: z.string().optional().default(''),
  signature_image: z.string().optional().default(''),
  serial: z.string().optional().default(''),
  body: z.string().optional().default(DEFAULT_BODY),
});

export type CertificateData = z.infer<typeof certificateSchema>;

export const certificateDefaults: CertificateData = {
  recipient_name: '',
  course_title: '',
  organization: '',
  issued_date: '',
  signatory_name: '',
  signatory_title: '',
  signature_image: '',
  serial: '',
  body: DEFAULT_BODY,
};

export const certificateDefinition: LayoutDefinition<typeof certificateSchema> = {
  meta: certificateMeta,
  schema: certificateSchema,
  defaults: certificateDefaults,
};
