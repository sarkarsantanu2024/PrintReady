// Mint one-time codes for the LOCALSTORAGE DEMO (when Supabase is NOT connected).
//
//   node scripts/gen-topup.mjs plan  <serial>   -> PLAN code  (+100 PDFs, ₹3200)
//   node scripts/gen-topup.mjs topup <serial>   -> TOP  code  (+30  PDFs, ₹500)
//
// In PRODUCTION (Supabase connected) you do NOT use this — instead insert a row:
//   insert into public.pr_topup_codes(code, credits) values ('PLAN-2026-06', 100);
//   insert into public.pr_topup_codes(code, credits) values ('TOP-2026-06-1', 30);
//
// SECRET must match SECRET in src/lib/quota.ts.
const SECRET = 'MMA-PRINTREADY-2026';

function sign(serial) {
  const input = `${SECRET}:${serial}`;
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
}

const kind = (process.argv[2] || 'topup').toLowerCase();
const prefix = kind === 'plan' ? 'PLAN' : 'TOP';
const serial = (process.argv[3] || `S${Date.now().toString(36).toUpperCase().slice(-5)}`)
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '');

console.log(`${prefix}-${serial}-${sign(serial)}`);
