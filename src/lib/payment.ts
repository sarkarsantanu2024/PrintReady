/**
 * Central payment / billing configuration.
 *
 * Edit the placeholder values below with the real merchant details before going
 * live. The same config feeds the PhonePe (UPI) QR in the top-up popup and the
 * GST invoice generated after a payment is confirmed.
 */

/** Merchant UPI details the PhonePe QR pays into. */
export const UPI = {
  /** Merchant UPI ID (VPA) — ICICI Bank (santanusarkar69@ibl). */
  vpa: 'santanusarkar69@ibl',
  payeeName: 'SANTANU SARKAR',
  note: 'PrintReady',
} as const;

/**
 * Build a UPI deep-link / QR payload that pre-fills the payee and amount, so a
 * scan in PhonePe (or any UPI app) opens straight to "Pay ₹<amount> to <payee>".
 */
export function upiUri(amount: number): string {
  // Encode spaces as %20 (not "+", which some UPI apps mis-decode), but keep the
  // VPA's "@" literal — UPI apps expect a raw "@" in `pa`, and an encoded %40 can
  // itself cause "Unable to scan QR".
  const enc = (v: string) => encodeURIComponent(v).replace(/%40/g, '@');
  const params = [
    ['pa', UPI.vpa],
    ['pn', UPI.payeeName],
    ['am', amount.toFixed(2)],
    ['cu', 'INR'],
    ['tn', UPI.note],
  ]
    .map(([k, v]) => `${k}=${enc(v)}`)
    .join('&');
  return `upi://pay?${params}`;
}

/** Seller block printed on the GST invoice. Fill in the real legal details. */
export const SELLER = {
  legalName: 'Dipesh Saha',
  brand: 'PrintReady',
  addressLines: ['Kolkata, West Bengal', 'India'],
  /** REPLACE with the registered GSTIN. */
  gstin: '19AAAAA0000A1Z5',
  stateName: 'West Bengal',
  stateCode: '19',
  phone: '9804243159',
  email: 'support@printready.app',
} as const;

/** GST rate applied (SaaS / online service = 18%). Listed prices are GST-inclusive. */
export const GST_RATE = 0.18;

/** SAC code for "Other information technology services". */
export const SELLER_SAC = '998314';
