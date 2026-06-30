import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Per-account quota (Stage 2). A paid account starts at granted = 0 — no quota,
 * can't generate — until the customer pays and redeems a super-admin code, which
 * sets its monthly PDF allowance (and QR allowance for QR-plan codes). PDF "used"
 * is this calendar month's count. Free is handled separately (built-in allowance).
 *
 * Supabase configured → real (migration 0007). Otherwise → localStorage fallback.
 */

export interface AccountQuota {
  granted: number;
  used: number;
  qrGranted: number;
  qrUsed: number;
  /** Subscription is within its 1-month window. */
  active: boolean;
  /** Whole days left in the current window. */
  daysLeft: number;
}

export type RedeemResult = { ok: boolean; reason?: string; granted?: number };

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const DEMO_KEY = 'pr:acctquota:v1';
type DemoRec = {
  granted: number;
  qrGranted: number;
  qrUsed: number;
  activatedAt?: number;
  validUntil?: number;
};
type DemoStore = Record<string, DemoRec>;

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
    /* demo only */
  }
}
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Usage count for an account since a timestamp (localStorage fallback path). */
function demoUsedSince(account: string, sinceMs: number): number {
  try {
    const rows = JSON.parse(localStorage.getItem('pr:usagelog:v1') || '[]') as {
      account: string;
      ts: number;
    }[];
    return rows.filter((r) => r.account === account && r.ts >= sinceMs).length;
  } catch {
    return 0;
  }
}

export async function getAccountQuota(account: string): Promise<AccountQuota> {
  const acc = account.trim().toLowerCase();
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_account_quota', { p_account: acc });
    if (!error && data) {
      const r = data as Record<string, unknown>;
      return {
        granted: num(r.granted),
        used: num(r.used),
        qrGranted: num(r.qr_granted),
        qrUsed: num(r.qr_used),
        active: Boolean(r.active),
        daysLeft: num(r.days_left),
      };
    }
  }
  const rec = demoLoad()[acc] ?? { granted: 0, qrGranted: 0, qrUsed: 0 };
  // Windowed: allowance only counts while now < validUntil.
  const now = Date.now();
  const active = !!rec.validUntil && rec.validUntil > now;
  const daysLeft = active ? Math.max(0, Math.ceil((rec.validUntil! - now) / 86400000)) : 0;
  return {
    granted: active ? rec.granted : 0,
    used: active ? demoUsedSince(acc, rec.activatedAt ?? 0) : 0,
    qrGranted: active ? rec.qrGranted : 0,
    qrUsed: rec.qrUsed,
    active,
    daysLeft,
  };
}


const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function genCode(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return 'SUB-' + Array.from(b, (x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('');
}

const CODES_KEY = 'pr:subcodes:v1';
type DemoCodes = Record<string, { account: string; credits: number; qrCredits: number; used: boolean }>;

/** Super-admin: issue a one-time subscription code bound to a subscriber. */
export async function issueSubscriptionCode(
  account: string,
  credits: number,
  qrCredits: number,
): Promise<{ ok: boolean; code?: string; reason?: string }> {
  const acc = account.trim().toLowerCase();
  const code = genCode();
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_admin_issue_code', {
      p_code: code,
      p_account: acc,
      p_credits: Math.max(0, Math.floor(credits)),
      p_qr_credits: Math.max(0, Math.floor(qrCredits)),
    });
    if (!error && data) {
      const r = data as { ok: boolean; reason?: string };
      return r.ok ? { ok: true, code } : { ok: false, reason: r.reason };
    }
  }
  try {
    const codes = JSON.parse(localStorage.getItem(CODES_KEY) || '{}') as DemoCodes;
    codes[code] = { account: acc, credits: Math.max(0, credits), qrCredits: Math.max(0, qrCredits), used: false };
    localStorage.setItem(CODES_KEY, JSON.stringify(codes));
  } catch {
    /* demo only */
  }
  return { ok: true, code };
}

/** Subscriber redeems a code for their own account → activates / tops up allowance. */
export async function redeemAccountCode(account: string, code: string): Promise<RedeemResult> {
  const acc = account.trim().toLowerCase();
  const norm = code.trim().toUpperCase();
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_redeem_account_code', { p_account: acc, p_code: norm });
    if (!error && data) {
      const r = data as RedeemResult;
      return r.ok ? { ok: true, granted: r.granted } : { ok: false, reason: r.reason };
    }
  }
  // Demo fallback
  let codes: DemoCodes;
  try {
    codes = JSON.parse(localStorage.getItem(CODES_KEY) || '{}') as DemoCodes;
  } catch {
    return { ok: false, reason: 'Invalid code.' };
  }
  const entry = codes[norm];
  if (!entry) return { ok: false, reason: 'Invalid code.' };
  if (entry.used) return { ok: false, reason: 'This code has already been used.' };
  if (entry.account && entry.account !== acc) {
    return { ok: false, reason: 'This code was issued for a different account.' };
  }
  entry.used = true;
  localStorage.setItem(CODES_KEY, JSON.stringify(codes));
  const store = demoLoad();
  const now = Date.now();
  const rec = store[acc] ?? { granted: 0, qrGranted: 0, qrUsed: 0 };
  const active = !!rec.validUntil && rec.validUntil > now;
  if (active) {
    // Top up the current window.
    rec.granted += entry.credits;
    rec.qrGranted += entry.qrCredits;
  } else {
    // Open a fresh 1-month window.
    rec.granted = entry.credits;
    rec.qrGranted = entry.qrCredits;
    rec.qrUsed = 0;
    rec.activatedAt = now;
    rec.validUntil = now + MONTH_MS;
  }
  store[acc] = rec;
  demoSave(store);
  bumpAccountQuota();
  return { ok: true, granted: rec.granted };
}

/* ----------------- reactive refresh (badge ↔ generate ↔ activate) --------- */

const listeners = new Set<() => void>();
/** Bump after a generate / activation so any mounted quota view re-fetches. */
export function bumpAccountQuota(): void {
  for (const l of listeners) l();
}

/** Live per-account quota; re-fetches on bumpAccountQuota(). */
export function useAccountQuota(account: string | null): AccountQuota | null {
  const [q, setQ] = useState<AccountQuota | null>(null);
  useEffect(() => {
    if (!account) {
      setQ(null);
      return;
    }
    let alive = true;
    const load = () => {
      void getAccountQuota(account).then((r) => alive && setQ(r));
    };
    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, [account]);
  return q;
}
