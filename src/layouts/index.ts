import { idCardDefinition } from './id-card/schema';
import { businessCardDefinition } from './business-card/schema';
import { certificateDefinition } from './certificate/schema';
import type { LayoutKind, LayoutMeta } from './types';

export const LAYOUTS = {
  id_card: idCardDefinition,
  business_card: businessCardDefinition,
  certificate: certificateDefinition,
} as const;

export const LAYOUT_LIST: LayoutMeta[] = [
  idCardDefinition.meta,
  businessCardDefinition.meta,
  certificateDefinition.meta,
];

export function getLayoutMeta(kind: LayoutKind): LayoutMeta {
  return LAYOUTS[kind].meta;
}

export type { LayoutKind, LayoutMeta } from './types';
