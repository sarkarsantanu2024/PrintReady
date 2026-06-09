import { useSyncExternalStore } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * STRICT MONTHLY quota for the Business plan — leak-proof.
 *
 * Nothing is free: the month starts at 0 and PDFs are only granted by redeeming
 * a code that YOU issue after receiving payment.
 *   - Plan code  (₹3200) → +100 PDFs for the month.
 *   - Top-up code (₹500) → +30 PDFs.
 * Everything resets to 0 on the 1st (no rollover).
 *
 * Storage:
 *  - Supabase configured → server-side, shared across devices, tamper-proof
 *    (see supabase/migrations/0002_quota.sql). Codes are rows you insert; their
 *    `credits` decide the grant (100 or 30).
 *  - Otherwise → localStorage fallback (demo only). Codes are signed offline
 *    (PLAN-… = 100, TOP-… = 30) via scripts/gen-topup.mjs.
 */
export const QUOTA_ENABLED = true;

export const PLAN_GRANT = 100; // ₹3200 monthly plan
export const PLAN_PRICE = 3200;
export const TOPUP_SIZE = 30; // ₹500 top-up
export const TOPUP_PRICE = 500;
/** Kept for UI copy ("plan covers 100 PDFs/month"). */
export const BASE_LIMIT = PLAN_GRANT;

const SECRET = 'MMA-PRINTREADY-2026';

export interface Usage {
  used: number;
  /** PDFs granted (and thus allowed) this month. */
  limit: number;
  remaining: number;
  month: string;
}

export function toUsage(used: number, granted: number, month: string): Usage {
  return { used, limit: granted, month, remaining: Math.max(0, granted - used) };
}

export type RedeemResult = { ok: boolean; reason?: string; usage?: Usage };

/* ----------------------------- Supabase path ----------------------------- */

interface QuotaRow {
  used: number;
  granted: number;
  month: string;
}

async function sbGet(): Promise<Usage | null> {
  const { data, error } = await supabase.rpc('pr_get_quota');
  if (error || !data) return null;
  const r = data as QuotaRow;
  return toUsage(r.used, r.granted, r.month);
}

async function sbConsume(): Promise<Usage | null> {
  const { data, error } = await supabase.rpc('pr_add_usage');
  if (error || !data) return null;
  const r = data as QuotaRow;
  return toUsage(r.used, r.granted, r.month);
}

async function sbRedeem(code: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc('pr_redeem_topup', {
    p_code: code.trim().toUpperCase(),
  });
  if (error || !data) return { ok: false, reason: 'Could not reach the server. Try again.' };
  const r = data as QuotaRow & { ok: boolean; reason?: string };
  return r.ok
    ? { ok: true, usage: toUsage(r.used, r.granted, r.month) }
    : { ok: false, reason: r.reason ?? 'Invalid code.' };
}

/* --------------------- localStorage fallback (demo) ---------------------- */

const KEY = 'pr:quota:v3'; // v3 = granted-credits model

interface LocalState {
  month: string;
  used: number;
  granted: number;
  usedCodes: string[];
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function lfresh(): LocalState {
  return { month: currentMonth(), used: 0, granted: 0, usedCodes: [] };
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
/** Returns the credit value of a signed code (PLAN-… = 100, TOP-… = 30), or null. */
function codeValue(code: string): number | null {
  const m = code.match(/^(PLAN|TOP)-([A-Z0-9]{2,})-([A-Z0-9]{4})$/);
  if (!m || sign(m[2]) !== m[3]) return null;
  return m[1] === 'PLAN' ? PLAN_GRANT : TOPUP_SIZE;
}

/* ------------------------------ public API ------------------------------- */

export async function getUsage(): Promise<Usage> {
  if (isSupabaseConfigured) {
    const u = await sbGet();
    if (u) return u;
  }
  const s = lload();
  return toUsage(s.used, s.granted, s.month);
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
  return toUsage(s.used, s.granted, s.month);
}

/** Redeem a one-time plan/top-up code. */
export async function redeemTopupCode(code: string): Promise<RedeemResult> {
  if (isSupabaseConfigured) return sbRedeem(code);
  const norm = code.trim().toUpperCase();
  const value = codeValue(norm);
  if (value === null) return { ok: false, reason: 'Invalid code.' };
  const s = lload();
  if (s.usedCodes.includes(norm)) {
    return { ok: false, reason: 'This code has already been used.' };
  }
  s.usedCodes.push(norm);
  s.granted += value;
  lsave(s);
  return { ok: true, usage: toUsage(s.used, s.granted, s.month) };
}

/* ----------------- reactive store (header badge ↔ page) ------------------ */

let _usage: Usage = toUsage(0, 0, '');
let _topupOpen = false;
const _listeners = new Set<() => void>();
const _subscribe = (cb: () => void) => {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
};
const _emit = () => _listeners.forEach((l) => l());

export function setQuota(u: Usage): void {
  _usage = u;
  _emit();
}

export async function refreshQuota(): Promise<Usage> {
  const u = await getUsage();
  setQuota(u);
  return u;
}

export function setTopupOpen(open: boolean): void {
  _topupOpen = open;
  _emit();
}
export const openTopup = () => setTopupOpen(true);

export function useQuota(): Usage {
  return useSyncExternalStore(
    _subscribe,
    () => _usage,
    () => _usage,
  );
}

export function useTopupOpen(): boolean {
  return useSyncExternalStore(
    _subscribe,
    () => _topupOpen,
    () => _topupOpen,
  );
}
