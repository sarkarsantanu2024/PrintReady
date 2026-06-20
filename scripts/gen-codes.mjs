// Print a year's worth of ready-to-paste monthly-plan code inserts for Supabase.
//
//   node scripts/gen-codes.mjs                 -> PDF-<MONTH>-2026-<RANDOM>, 130 credits
//   node scripts/gen-codes.mjs 2027            -> codes for 2027
//   node scripts/gen-codes.mjs 2026 150        -> override the credits (PDFs) per code
//
// SECURITY — why the random token matters:
//   A code works only if it is a row in pr_topup_codes. If you pre-load a whole
//   year of PLAIN codes (PDF-JULY-2026, PDF-AUGUST-2026, …) a paying client can
//   read the pattern and redeem next month's code WITHOUT PAYING. The random
//   token (e.g. PDF-JUNE-2026-7F3QX9TK) is unguessable, so even with every month
//   pre-loaded nobody can fabricate another month's code. Send the client the
//   FULL code only after their payment lands.
//
// Codes are UPPERCASE and single-use. Paste the output into the Supabase SQL
// editor; `on conflict do nothing` makes it safe to re-run.

import { randomBytes } from 'node:crypto';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

// Crockford-ish alphabet: no 0/O/1/I/L/U to avoid misreads over phone/WhatsApp.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

/** n unguessable uppercase chars (~5 bits of entropy each; 8 chars ≈ 40 bits). */
function token(n = 8) {
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const year = String(process.argv[2] || '2026').replace(/[^0-9]/g, '') || '2026';
const credits = Number(process.argv[3]) > 0 ? Math.floor(Number(process.argv[3])) : 130;

console.log(`-- Monthly plan codes for ${year} (${credits} PDFs each). Single-use; UNIQUE per month.`);
console.log(`-- Keep these secret — send each client only the month they paid for.`);
for (const month of MONTHS) {
  const code = `PDF-${month}-${year}-${token()}`;
  console.log(
    `insert into public.pr_topup_codes(code, credits) values ('${code}', ${credits}) on conflict (code) do nothing;`,
  );
}
