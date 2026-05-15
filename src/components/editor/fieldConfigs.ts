import type { FieldConfig } from './FormPanel';
import type { IdCardData } from '@/layouts/id-card/schema';
import type { BusinessCardData } from '@/layouts/business-card/schema';
import type { CertificateData } from '@/layouts/certificate/schema';
import type { LayoutKind } from '@/layouts/types';

export const idCardFields: FieldConfig<IdCardData>[] = [
  { name: 'photo', label: 'Photo', type: 'image', span: 2 },
  { name: 'full_name', label: 'Full name', required: true, span: 2, placeholder: 'Asha Kumar' },
  { name: 'designation', label: 'Designation', required: true, placeholder: 'Senior Engineer' },
  { name: 'id_number', label: 'ID number', required: true, placeholder: 'EMP-2031' },
  { name: 'department', label: 'Department', placeholder: 'Engineering' },
  { name: 'blood_group', label: 'Blood group', placeholder: 'O+' },
  { name: 'valid_until', label: 'Valid until', type: 'date' },
  { name: 'qr_data', label: 'QR data (defaults to ID)', placeholder: 'EMP-2031' },
  { name: 'org_name', label: 'Organisation name', span: 2, placeholder: 'Acme Corp' },
  { name: 'org_logo', label: 'Organisation logo', type: 'image', span: 2 },
];

export const businessCardFields: FieldConfig<BusinessCardData>[] = [
  { name: 'full_name', label: 'Full name', required: true, span: 2 },
  { name: 'title', label: 'Title / Role', placeholder: 'Founder' },
  { name: 'company', label: 'Company', required: true, placeholder: 'Acme' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', placeholder: '+91 98xxx xxxxx' },
  { name: 'website', label: 'Website', span: 2, placeholder: 'https://acme.example' },
  { name: 'address', label: 'Address', type: 'textarea', span: 2 },
  { name: 'logo', label: 'Logo', type: 'image', span: 2 },
  {
    name: 'qr_enabled',
    label: 'vCard QR code',
    type: 'checkbox',
    placeholder: 'Generate vCard QR',
    span: 2,
  },
];

export const certificateFields: FieldConfig<CertificateData>[] = [
  { name: 'recipient_name', label: 'Recipient name', required: true, span: 2 },
  { name: 'course_title', label: 'Course / Award title', required: true, span: 2 },
  { name: 'organization', label: 'Organisation', required: true, span: 2 },
  { name: 'issued_date', label: 'Issued date', type: 'date' },
  { name: 'serial', label: 'Certificate serial' },
  { name: 'signatory_name', label: 'Signatory name' },
  { name: 'signatory_title', label: 'Signatory title' },
  { name: 'signature_image', label: 'Signature image', type: 'image', span: 2 },
  { name: 'body', label: 'Body text', type: 'textarea', span: 2 },
];

export interface FieldConfigsByLayout {
  id_card: typeof idCardFields;
  business_card: typeof businessCardFields;
  certificate: typeof certificateFields;
}

export const FIELDS: FieldConfigsByLayout = {
  id_card: idCardFields,
  business_card: businessCardFields,
  certificate: certificateFields,
};

export function getFieldsFor(kind: LayoutKind) {
  return FIELDS[kind];
}
