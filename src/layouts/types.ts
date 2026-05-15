import type { z } from 'zod';

export type LayoutKind = 'id_card' | 'business_card' | 'certificate';

export interface LayoutMeta {
  kind: LayoutKind;
  label: string;
  /** Final card dimensions in mm at 100% scale. */
  widthMm: number;
  heightMm: number;
  /** Recommended layout when placing on A4. */
  perA4: number;
  /** Default sheet for the editor. */
  defaultSheet: 'A4';
  defaultOrientation: 'portrait' | 'landscape';
}

export interface LayoutDefinition<T extends z.ZodTypeAny> {
  meta: LayoutMeta;
  schema: T;
  defaults: z.infer<T>;
}
