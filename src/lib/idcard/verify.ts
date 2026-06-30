import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Verifiable QR — paid add-on. Each printed card carries a unique code encoded
 * in a QR. Scanning opens `/verify/<code>`, which reads the card record from
 * Supabase (photo + name + org + valid/revoked) so a guard can confirm the card
 * is genuine.
 *
 * NOTE: this is the one feature that deliberately stores card data on the
 * server (photo included) — verification is impossible otherwise. The base
 * (non-QR) flow still keeps everything in the browser.
 *
 * Storage:
 *   - Supabase configured → real, shared, tamper-proof (migration 0003).
 *   - Otherwise → localStorage fallback so demos still scan end-to-end.
 */

export interface CardRecord {
  code: string;
  name: string;
  org: string;
  /** base64 PNG data URL, or null. */
  photo: string | null;
}

export interface VerifyResult {
  found: boolean;
  revoked?: boolean;
  code?: string;
  name?: string;
  org?: string;
  photo?: string | null;
  issued?: string;
}

export type RegisterResult = { ok: boolean; reason?: string };

/** Unambiguous base32 alphabet (no 0/O/1/I) for human-readable card codes. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Generates a unique, scannable card code, e.g. `PR-7F3A-9K2X`. */
export function genCardCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `PR-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}`;
}

/**
 * Base URL the QR points at. Defaults to the current origin so it "just works"
 * on whatever domain the app is served from; override with VITE_VERIFY_BASE_URL
 * if cards must point at a fixed production domain.
 */
export function verifyBaseUrl(): string {
  const env = import.meta.env.VITE_VERIFY_BASE_URL as string | undefined;
  const base = (env && env.trim()) || window.location.origin;
  return base.replace(/\/+$/, '');
}

export function verifyUrl(code: string): string {
  // Short path keeps the QR low-density (more scannable) than /verify/.
  return `${verifyBaseUrl()}/v/${encodeURIComponent(code)}`;
}

/** Uint8Array PNG → base64 data URL (for server storage / on-screen preview). */
export function pngToDataUrl(bytes: Uint8Array | null): string | null {
  if (!bytes || bytes.length === 0) return null;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:image/png;base64,${btoa(bin)}`;
}

/* ------------------------------ demo fallback ----------------------------- */

const DEMO_KEY = 'pr:verified:v1';
type DemoStore = Record<string, { name: string; org: string; photo: string | null; revoked: boolean; issued: string }>;

function demoLoad(): DemoStore {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}') as DemoStore;
  } catch {
    return {};
  }
}
function demoSave(s: DemoStore): void {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(s));
  } catch {
    /* storage full — demo only */
  }
}

/* ------------------------------- public API ------------------------------ */

/**
 * Registers a batch of cards so their codes resolve when scanned. Metered per
 * card against the QR allowance — returns { ok:false, reason } if exhausted.
 */
export async function registerCards(account: string, cards: CardRecord[]): Promise<RegisterResult> {
  if (cards.length === 0) return { ok: true };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_register_cards_acc', {
      p_account: account.trim().toLowerCase(),
      p_cards: cards.map((c) => ({
        code: c.code.toUpperCase(),
        name: c.name,
        org: c.org,
        photo: c.photo,
      })),
    });
    if (!error && data) {
      const r = data as RegisterResult;
      return r.ok ? { ok: true } : { ok: false, reason: r.reason ?? 'Could not register cards.' };
    }
    // fall through to demo on transport/missing-function error
  }

  // Demo: no real allowance gate — just persist so /verify works locally.
  const store = demoLoad();
  const issued = new Date().toISOString();
  for (const c of cards) {
    store[c.code.toUpperCase()] = { name: c.name, org: c.org, photo: c.photo, revoked: false, issued };
  }
  demoSave(store);
  return { ok: true };
}

/** Looks up a scanned code. Used by the public /verify page. */
export async function verifyCard(code: string): Promise<VerifyResult> {
  const norm = code.trim().toUpperCase();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_verify_card', { p_code: norm });
    if (error || !data) return { found: false };
    return data as VerifyResult;
  }

  const rec = demoLoad()[norm];
  if (!rec) return { found: false };
  return {
    found: true,
    revoked: rec.revoked,
    code: norm,
    name: rec.name,
    org: rec.org,
    photo: rec.photo,
    issued: rec.issued,
  };
}

/** Revokes a card (lost/stolen) so it scans as NOT VALID. */
export async function revokeCard(code: string): Promise<RegisterResult> {
  const norm = code.trim().toUpperCase();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_revoke_card', { p_code: norm });
    if (error || !data) return { ok: false, reason: 'Could not reach the server. Try again.' };
    return data as RegisterResult;
  }

  const store = demoLoad();
  if (!store[norm]) return { ok: false, reason: 'Card not found.' };
  store[norm].revoked = true;
  demoSave(store);
  return { ok: true };
}
