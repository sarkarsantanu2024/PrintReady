/**
 * Single source of truth for PrintReady's plans and what each one unlocks.
 *
 * Reshaped per the client:
 *   Free       — ₹0,    20 PDFs,  no login
 *   Business   — ₹2300, 150 PDFs, OWN login     (the Verifiable-QR plan)
 *   Enterprise — ₹3500, 250 PDFs, OWN login     (+ student database)
 *   Custom     — MANAGED plan for bespoke customers. MindMantra Abacus is on
 *                this (login santanu.sarkar/12345, unchanged); shown as "Custom".
 *
 * Note: the public pricing page also shows a "Customized" marketing card with
 * contact-us pricing — that is NOT this `custom` entry (which carries MMA's real
 * ₹1960/130 details used for auth + report money). They are intentionally
 * separate so MMA's experience never changes.
 *
 * Feature gating (QR toggle + Report) is driven entirely by these flags so the
 * login page, the generator and the report all agree.
 */

export type PlanId = 'free' | 'business' | 'enterprise' | 'custom';
export type Role = 'user' | 'superadmin';

export interface PlanDef {
  id: PlanId;
  label: string;
  tagline: string;
  monthly: number;
  yearly: number;
  /** Monthly print-ready-PDF allowance (marketing + report money base). */
  pdfs: number;
  loginRequired: boolean;
  /** How a user of this plan signs in. */
  credential: 'fixed' | 'account';
  /** Verifiable-QR add-on available on this plan. */
  qr: boolean;
  /** "Generated report" available on this plan. */
  report: boolean;
  /** Saved student database. */
  studentDb: boolean;
  features: string[];
  badgeClass: string;
  badge?: string;
  highlight?: boolean;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: 'free',
    label: 'Free',
    tagline: 'Try it out — no account needed.',
    monthly: 0,
    yearly: 0,
    pdfs: 10,
    loginRequired: false,
    credential: 'fixed',
    qr: false,
    report: false,
    studentDb: false,
    features: ['10 print-ready PDFs / mo', 'No login required', 'Auto photo + details'],
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  },
  business: {
    id: 'business',
    label: 'Business',
    tagline: 'Verifiable QR cards + monthly reports.',
    monthly: 2300,
    yearly: 23000,
    pdfs: 150,
    loginRequired: true,
    credential: 'account',
    qr: true,
    report: true,
    studentDb: false,
    features: [
      '150 print-ready PDFs / mo',
      'Login required',
      'Verifiable QR cards',
      'Generated report',
      'Dedicated support',
    ],
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    badge: 'Most popular',
    highlight: true,
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    tagline: 'High volume with a saved student database.',
    monthly: 3500,
    yearly: 35000,
    pdfs: 250,
    loginRequired: true,
    credential: 'account',
    qr: true,
    report: true,
    studentDb: true,
    features: [
      '250 print-ready PDFs / mo',
      'Login required',
      'Verifiable QR cards',
      'Generated report',
      'Student database',
      'Dedicated support',
    ],
    badgeClass: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    tagline: 'Managed plan, tailored to the customer.',
    monthly: 1960, // MindMantra Abacus's existing arrangement — drives report money.
    yearly: 19600,
    pdfs: 130,
    loginRequired: true,
    credential: 'fixed', // MMA uses a fixed login; others self-serve a custom plan
    qr: false, // Verifiable QR is Business/Enterprise only
    report: true,
    studentDb: false,
    features: [
      'Choose your own PDFs / month',
      'Price scales with your volume',
      'Generated report',
      'Dedicated support',
    ],
    badgeClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  },
};

/** Login dropdown order. (Custom is selectable; MMA's credential also resolves
 *  to Custom regardless of the chosen option, so their flow never breaks.) */
export const PLAN_ORDER: PlanId[] = ['free', 'business', 'enterprise', 'custom'];

export function planById(id: PlanId | null | undefined): PlanDef | null {
  return id ? PLANS[id] ?? null : null;
}

/** Verifiable QR is strictly a Business/Enterprise feature (not Custom/admin). */
export function planHasQr(plan: PlanId | null): boolean {
  return !!plan && PLANS[plan].qr;
}

/** Report: any plan with the flag, plus the super admin (sees all reports). */
export function planHasReport(plan: PlanId | null, role: Role): boolean {
  return role === 'superadmin' || (!!plan && PLANS[plan].report);
}

/** Custom plan pricing: the customer picks PDFs/mo and price scales with it. */
export const CUSTOM_RATE_PER_PDF = 1960 / 130; // ≈ ₹15.08/PDF (MMA's baseline)
export function customPrice(pdfs: number): number {
  return Math.max(0, Math.round((pdfs * CUSTOM_RATE_PER_PDF) / 10) * 10);
}
