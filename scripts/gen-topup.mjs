// Mint one-time top-up codes for the PrintReady Business plan.
// Each redeemed code adds +30 PDFs to the client's monthly allowance.
//
// Usage:
//   node scripts/gen-topup.mjs <serial>      e.g. node scripts/gen-topup.mjs INV1042
//   node scripts/gen-topup.mjs               (auto serial from a counter you choose)
//
// Give the printed code to the client AFTER they pay ₹500. It can be used once.
// IMPORTANT: SECRET here must match SECRET in src/lib/quota.ts.

const SECRET = 'MMA-PRINTREADY-2026';

function sign(serial) {
  const input = `${SECRET}:${serial}`;
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
}

function generate(serial) {
  const s = String(serial).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `TOP-${s}-${sign(s)}`;
}

const serial = process.argv[2] || `S${Date.now().toString(36).toUpperCase().slice(-5)}`;
console.log(generate(serial));
