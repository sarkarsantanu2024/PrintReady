import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { GST_RATE, SELLER, SELLER_SAC } from '@/lib/payment';
import { triggerDownload, safeFilename } from '@/lib/download';

/**
 * GST tax invoice generator — styled after a Supabase / Stripe receipt.
 *
 * Payment is GST-INCLUSIVE: the amount the client paid (e.g. ₹1960) is the
 * grand total, and the tax shown is the GST contained within it
 * (CGST 9% + SGST 9% for an intra-state supply). This keeps "Amount paid" equal
 * to what was actually charged via PhonePe.
 */
export interface InvoiceInput {
  /** What was bought. */
  kind: 'plan' | 'topup';
  /** Total amount paid, GST-inclusive (₹). */
  amount: number;
  /** PDFs granted by this purchase. */
  qty: number;
  /** Redeemed code — doubles as the payment reference. */
  code: string;
  /** Optional "Bill to" details supplied by the client. */
  buyerName?: string;
  buyerCenter?: string;
  buyerGstin?: string;
  /** Issue date (defaults to now). */
  date?: Date;
}

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 48;
const INK = rgb(0.1, 0.12, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.85, 0.87, 0.9);
const BRAND = rgb(0.882, 0.282, 0.0); // #E14800

/** Money as "Rs. 1,960.00" — the PDF base fonts can't encode the ₹ glyph. */
function money(n: number): string {
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function invoiceNumber(d: Date, code: string): string {
  const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const suffix = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-8) || 'PAYMENT';
  return `INV-${ymd}-${suffix}`;
}

export async function generateInvoicePdf(input: InvoiceInput): Promise<Blob> {
  const date = input.date ?? new Date();
  const pdf = await PDFDocument.create();
  pdf.setTitle(`PrintReady Invoice ${invoiceNumber(date, input.code)}`);
  pdf.setProducer('PrintReady');
  pdf.setCreator('PrintReady');

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([A4.w, A4.h]);

  // GST-inclusive maths.
  const total = input.amount;
  const taxable = total / (1 + GST_RATE);
  const gstTotal = total - taxable;
  const cgst = gstTotal / 2;
  const sgst = gstTotal / 2;

  const left = MARGIN;
  const right = A4.w - MARGIN;

  const text = (
    s: string,
    x: number,
    y: number,
    opts: { font?: PDFFont; size?: number; color?: typeof INK } = {},
  ) => {
    page.drawText(s, { x, y, size: opts.size ?? 9.5, font: opts.font ?? font, color: opts.color ?? INK });
  };
  const rtext = (
    s: string,
    xRight: number,
    y: number,
    opts: { font?: PDFFont; size?: number; color?: typeof INK } = {},
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 9.5;
    text(s, xRight - f.widthOfTextAtSize(s, size), y, opts);
  };
  const rule = (y: number) =>
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: LINE });

  let y = A4.h - MARGIN;

  // --- Header: INVOICE heading (no brand logo) ---
  rtext('TAX INVOICE', right, y, { font: bold, size: 16 });
  rtext('Original for Recipient', right, y - 16, { size: 8.5, color: MUTED });
  y -= 40;

  // --- Meta: invoice no / dates ---
  const invNo = invoiceNumber(date, input.code);
  const dStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  text('Invoice number', left, y, { size: 8.5, color: MUTED });
  text(invNo, left, y - 13, { font: bold });
  text('Date of issue', left + 200, y, { size: 8.5, color: MUTED });
  text(dStr, left + 200, y - 13, { font: bold });
  rtext('Amount paid', right, y, { size: 8.5, color: MUTED });
  rtext(money(total), right, y - 14, { font: bold, size: 13, color: BRAND });
  y -= 36;
  rule(y);
  y -= 24;

  // --- From / Bill to ---
  const colR = left + 270;
  let yFrom = y;
  text('From', left, yFrom, { size: 8.5, color: MUTED });
  text('Billed to', colR, yFrom, { size: 8.5, color: MUTED });
  yFrom -= 15;

  const fromLines = [
    SELLER.legalName,
    ...SELLER.addressLines,
    `State: ${SELLER.stateName} (${SELLER.stateCode})`,
  ];
  const toLines = [
    input.buyerName?.trim() || 'Customer',
    input.buyerCenter?.trim() || '',
    input.buyerGstin?.trim() ? `GSTIN: ${input.buyerGstin.trim()}` : 'GSTIN: Unregistered',
  ].filter(Boolean);

  const maxRows = Math.max(fromLines.length, toLines.length);
  for (let i = 0; i < maxRows; i++) {
    if (fromLines[i]) text(fromLines[i], left, yFrom - i * 13, { font: i === 0 ? bold : font });
    if (toLines[i]) text(toLines[i], colR, yFrom - i * 13, { font: i === 0 ? bold : font });
  }
  y = yFrom - maxRows * 13 - 16;
  rule(y);
  y -= 18;

  // --- Line-item table ---
  const cQty = right - 210;
  const cRate = right - 120;
  const cAmt = right;
  text('DESCRIPTION', left, y, { size: 8, color: MUTED, font: bold });
  rtext('QTY', cQty, y, { size: 8, color: MUTED, font: bold });
  rtext('RATE', cRate, y, { size: 8, color: MUTED, font: bold });
  rtext('AMOUNT', cAmt, y, { size: 8, color: MUTED, font: bold });
  y -= 8;
  rule(y);
  y -= 18;

  const desc =
    input.kind === 'plan'
      ? `Monthly Business plan - ${input.qty} print-ready PDFs`
      : `Top-up - ${input.qty} print-ready PDFs`;
  text(desc, left, y, { font: bold });
  text(`SAC ${SELLER_SAC} · ref ${input.code}`, left, y - 12, { size: 8, color: MUTED });
  rtext(String(input.qty), cQty, y);
  rtext(money(taxable), cRate, y);
  rtext(money(taxable), cAmt, y);
  y -= 28;
  rule(y);
  y -= 20;

  // --- Totals (right-aligned summary) ---
  const labelX = right - 230;
  const summary: Array<[string, string, boolean]> = [
    ['Subtotal (taxable value)', money(taxable), false],
    [`CGST @ ${((GST_RATE / 2) * 100).toFixed(0)}%`, money(cgst), false],
    [`SGST @ ${((GST_RATE / 2) * 100).toFixed(0)}%`, money(sgst), false],
    ['Total', money(total), true],
  ];
  for (const [label, value, strong] of summary) {
    if (strong) {
      y -= 4;
      rule(y + 14);
    }
    text(label, labelX, y, { font: strong ? bold : font, color: strong ? INK : MUTED, size: strong ? 11 : 9.5 });
    rtext(value, cAmt, y, { font: strong ? bold : font, size: strong ? 11 : 9.5 });
    y -= strong ? 20 : 16;
  }

  y -= 6;
  page.drawRectangle({
    x: left,
    y: y - 22,
    width: right - left,
    height: 28,
    color: rgb(0.96, 0.85, 0.78),
  });
  text('Amount paid', left + 12, y - 13, { font: bold });
  rtext(`${money(total)}  ·  Paid via PhonePe / UPI`, right - 12, y - 13, { font: bold, color: BRAND });
  y -= 40;

  // --- Footer: a thin closing rule, no text ---
  rule(y);

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

/** Build the invoice and trigger a browser download. */
export async function downloadInvoice(input: InvoiceInput): Promise<void> {
  const blob = await generateInvoicePdf(input);
  const date = input.date ?? new Date();
  triggerDownload(blob, `${safeFilename(invoiceNumber(date, input.code))}.pdf`);
}
