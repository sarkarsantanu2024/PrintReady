import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Monthly print-ready-PDF quota for the Business plan.
 *
 * The quota counts GENERATED + downloaded PDFs (one per "Generate" action,
 * regardless of how many cards a sheet contains). Uploading/previewing is free.
 *
 * Storage:
 *  - When Supabase is configured (VITE_SUPABASE_URL / _ANON_KEY) the quota lives
 *    SERVER-SIDE via SECURITY DEFINER RPCs (see supabase/migrations/0002_quota.sql).
 *    That makes it shared across devices, tamper-proof (the browser can't edit
 *    the count or read the top-up secret), and immune to clearing browser data.
 *  - Otherwise it falls back to localStorage (demo only — same limitations as
 *    before: per-browser, editable, cleared with browser data).
 *
 * Resets on the 1st of each month: count + top-ups.
 */
export const QUOTA_ENABLED = true;

export const BASE_LIMIT = 100;
export const TOPUP_SIZE = 30;
export const TOPUP_PRICE = 500;

export interface Usage {
  used: number;
  limit: number;
  remaining: number;
  topups: number;
  month: string;
}

export function toUsage(used: number, topups: number, month: string): Usage {
  const limit = BASE_LIMIT + topups * TOPUP_SIZE;
  return { used, topups, month, limit, remaining: Math.max(0, limit - used) };
}

export type RedeemResult = { ok: boolean; reason?: string; usage?: Usage };

/* ----------------------------- Supabase path ----------------------------- */

interface QuotaRow {
  used: number;
  topups: number;
  month: string;
}

async function sbGet(): Promise<Usage | null> {
  const { data, error } = await supabase.rpc('pr_get_quota');
  if (error || !data) return null;
  const r = data as QuotaRow;
  return toUsage(r.used, r.topups, r.month);
}

async function sbConsume(): Promise<Usage | null> {
  const { data, error } = await supabase.rpc('pr_add_usage');
  if (error || !data) return null;
  const r = data as QuotaRow;
  return toUsage(r.used, r.topups, r.month);
}

async function sbRedeem(code: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc('pr_redeem_topup', {
    p_code: code.trim().toUpperCase(),
  });
  if (error || !data) return { ok: false, reason: 'Could not reach the server. Try again.' };
  const r = data as QuotaRow & { ok: boolean; reason?: string };
  return r.ok
    ? { ok: true, usage: toUsage(r.used, r.topups, r.month) }
    : { ok: false, reason: r.reason ?? 'Invalid code.' };
}

/* --------------------- localStorage fallback (demo) ---------------------- */

const KEY = 'pr:quota:v2';
const SECRET = 'MMA-PRINTREADY-2026';

interface LocalState {
  month: string;
  used: number;
  topups: number;
  usedCodes: string[];
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function lfresh(): LocalState {
  return { month: currentMonth(), used: 0, topups: 0, usedCodes: [] };
}
function lload(): LocalState {
  let s: LocalState;
  try {
    const raw = localStorage.getItem(KEY);
    s = raw ? (JSON.parse(raw) as LocalState) : lfresh();
  } catch {
    s = lfresh();
  }
  if (s.month !== currentMonth()) {
    s = lfresh();
    lsave(s);
  }
  return s;
}
function lsave(s: LocalState): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
function sign(serial: string): string {
  const input = `${SECRET}:${serial}`;
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
}
function isValidCode(code: string): boolean {
  const m = code.match(/^TOP-([A-Z0-9]{2,})-([A-Z0-9]{4})$/);
  return !!m && sign(m[1]) === m[2];
}

/* ------------------------------ public API ------------------------------- */

export async function getUsage(): Promise<Usage> {
  if (isSupabaseConfigured) {
    const u = await sbGet();
    if (u) return u;
  }
  const s = lload();
  return toUsage(s.used, s.topups, s.month);
}

/** Bill one generated PDF and return the updated usage. */
export async function consumeOne(): Promise<Usage> {
  if (isSupabaseConfigured) {
    const u = await sbConsume();
    if (u) return u;
  }
  const s = lload();
  s.used += 1;
  lsave(s);
  return toUsage(s.used, s.topups, s.month);
}

/** Redeem a one-time top-up code → +30 PDFs. */
export async function redeemTopupCode(code: string): Promise<RedeemResult> {
  if (isSupabaseConfigured) return sbRedeem(code);
  const norm = code.trim().toUpperCase();
  if (!isValidCode(norm)) return { ok: false, reason: 'Invalid top-up code.' };
  const s = lload();
  if (s.usedCodes.includes(norm)) {
    return { ok: false, reason: 'This code has already been used.' };
  }
  s.usedCodes.push(norm);
  s.topups += 1;
  lsave(s);
  return { ok: true, usage: toUsage(s.used, s.topups, s.month) };
}
