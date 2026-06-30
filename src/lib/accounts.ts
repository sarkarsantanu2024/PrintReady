import { isSupabaseConfigured, supabase } from './supabase';
import type { PlanId } from './plans';

/**
 * Self-service logins for the paid plans (Business / Enterprise). Free & Starter
 * use the fixed credential in clientAuth; the super admin is a separate fixed
 * credential there too. This module only handles user-created accounts.
 *
 * Supabase configured → real, shared accounts (migration 0004).
 * Otherwise → localStorage fallback so the demo works offline.
 */

export interface NewAccount {
  username: string; // the login id
  password: string;
  plan: PlanId;
  centerName: string;
  centerType: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  /** Custom plan only: chosen monthly PDF volume + the price it computes to. */
  customPdfs?: number;
  customPrice?: number;
}

export type AccountResult = {
  ok: boolean;
  reason?: string;
  plan?: PlanId;
  /** Effective monthly price (custom accounts) — drives the report's money. */
  price?: number;
  pdfs?: number;
};

const DEMO_KEY = 'pr:accounts:v1';
type DemoStore = Record<
  string,
  {
    password: string;
    plan: PlanId;
    centerName: string;
    centerType?: string;
    fullName: string;
    email?: string;
    phone?: string;
    address?: string;
    customPdfs?: number;
    customPrice?: number;
  }
>;

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

export async function createAccount(a: NewAccount): Promise<AccountResult> {
  const username = a.username.trim().toLowerCase();
  if (!username) return { ok: false, reason: 'A username/email is required.' };
  if (!a.password) return { ok: false, reason: 'A password is required.' };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_create_account', {
      p: {
        username,
        password: a.password,
        plan: a.plan,
        center_name: a.centerName,
        center_type: a.centerType,
        full_name: a.fullName,
        email: a.email,
        phone: a.phone,
        address: a.address,
        custom_pdfs: a.customPdfs ?? null,
        custom_price: a.customPrice ?? null,
      },
    });
    // Use the server result when available; otherwise (RPC not yet deployed /
    // offline) fall through to the localStorage path so signup still works.
    if (!error && data) {
      const r = data as AccountResult;
      return r.ok ? { ok: true, plan: a.plan } : { ok: false, reason: r.reason };
    }
  }

  const store = demoLoad();
  if (store[username]) return { ok: false, reason: 'An account with this email already exists.' };
  store[username] = {
    password: a.password,
    plan: a.plan,
    centerName: a.centerName,
    centerType: a.centerType,
    fullName: a.fullName,
    email: a.email,
    phone: a.phone,
    address: a.address,
    customPdfs: a.customPdfs,
    customPrice: a.customPrice,
  };
  demoSave(store);
  return { ok: true, plan: a.plan };
}

/** Verify a created account's credentials. Plan is derived from the account. */
export async function verifyAccount(username: string, password: string): Promise<AccountResult> {
  const id = username.trim().toLowerCase();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_login_account', {
      p_username: id,
      p_password: password,
      p_plan: null,
    });
    if (!error && data) {
      const r = data as AccountResult;
      return r.ok
        ? { ok: true, plan: r.plan as PlanId, price: r.price, pdfs: r.pdfs }
        : { ok: false, reason: r.reason };
    }
    // RPC unavailable → fall through to localStorage accounts.
  }

  const rec = demoLoad()[id];
  if (!rec || rec.password !== password) {
    return { ok: false, reason: 'Incorrect username or password.' };
  }
  return { ok: true, plan: rec.plan, price: rec.customPrice, pdfs: rec.customPdfs };
}

/**
 * Self-service password reset: the subscriber proves identity with their
 * username + center name (the value they set at signup), then sets a new
 * password. (No email infra — center name is the shared secret.)
 */
export async function resetPassword(
  username: string,
  centerName: string,
  newPassword: string,
): Promise<AccountResult> {
  const id = username.trim().toLowerCase();
  if (!newPassword || newPassword.length < 5) {
    return { ok: false, reason: 'New password must be at least 5 characters.' };
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_reset_password', {
      p_username: id,
      p_center: centerName.trim(),
      p_password: newPassword,
    });
    if (!error && data) {
      const r = data as AccountResult;
      return r.ok ? { ok: true } : { ok: false, reason: r.reason };
    }
    // RPC unavailable → fall through to localStorage accounts.
  }

  const store = demoLoad();
  const rec = store[id];
  if (!rec) return { ok: false, reason: 'No account found for that username.' };
  if ((rec.centerName ?? '').trim().toLowerCase() !== centerName.trim().toLowerCase()) {
    return { ok: false, reason: 'Center name does not match our records.' };
  }
  rec.password = newPassword;
  demoSave(store);
  return { ok: true };
}

export interface AccountInfo {
  username: string;
  centerName?: string;
  fullName?: string;
  plan: PlanId;
}

export interface AccountDetails {
  username: string;
  fullName?: string;
  centerName?: string;
  centerType?: string;
  email?: string;
  phone?: string;
  address?: string;
  plan: PlanId;
  customPdfs?: number;
  customPrice?: number;
}

/** Full (password-free) details for the profile page. */
export async function getAccountInfo(account: string): Promise<AccountDetails | null> {
  const acc = account.trim().toLowerCase();
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_account_info', { p_account: acc });
    if (!error && data && (data as { username?: string }).username) {
      const r = data as Record<string, unknown>;
      return {
        username: String(r.username),
        fullName: r.full_name as string,
        centerName: r.center_name as string,
        centerType: r.center_type as string,
        email: r.email as string,
        phone: r.phone as string,
        address: r.address as string,
        plan: r.plan as PlanId,
        customPdfs: r.custom_pdfs as number,
        customPrice: r.custom_price as number,
      };
    }
  }
  const rec = demoLoad()[acc];
  if (!rec) return null;
  return {
    username: acc,
    fullName: rec.fullName,
    centerName: rec.centerName,
    centerType: rec.centerType,
    email: rec.email,
    phone: rec.phone,
    address: rec.address,
    plan: rec.plan,
    customPdfs: rec.customPdfs,
    customPrice: rec.customPrice,
  };
}

export interface ProfileEdit {
  fullName: string;
  centerName: string;
  centerType: string;
  email: string;
  phone: string;
  address: string;
}

/** Update the signed-in subscriber's own profile details (not password/plan). */
export async function updateProfile(account: string, e: ProfileEdit): Promise<AccountResult> {
  const acc = account.trim().toLowerCase();
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_update_profile', {
      p_account: acc,
      p_full_name: e.fullName,
      p_center_name: e.centerName,
      p_center_type: e.centerType,
      p_email: e.email,
      p_phone: e.phone,
      p_address: e.address,
    });
    if (!error && data) {
      const r = data as AccountResult;
      return r.ok ? { ok: true } : { ok: false, reason: r.reason };
    }
  }
  const store = demoLoad();
  const rec = store[acc];
  if (!rec) return { ok: false, reason: 'Unknown account.' };
  rec.fullName = e.fullName;
  rec.centerName = e.centerName;
  rec.centerType = e.centerType;
  rec.email = e.email;
  rec.phone = e.phone;
  rec.address = e.address;
  demoSave(store);
  return { ok: true };
}

/** Switch an account's plan (Custom may also change PDFs/mo + price). Resets allowance. */
export async function setPlan(
  account: string,
  plan: PlanId,
  customPdfs?: number,
  customPrice?: number,
): Promise<AccountResult> {
  const acc = account.trim().toLowerCase();
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_set_plan', {
      p_account: acc,
      p_plan: plan,
      p_custom_pdfs: plan === 'custom' ? (customPdfs ?? null) : null,
      p_custom_price: plan === 'custom' ? (customPrice ?? null) : null,
    });
    if (!error && data) {
      const r = data as AccountResult;
      return r.ok ? { ok: true, plan, price: customPrice, pdfs: customPdfs } : { ok: false, reason: r.reason };
    }
  }
  // Demo: update the local account + reset its activated allowance.
  const store = demoLoad();
  const rec = store[acc];
  if (!rec) return { ok: false, reason: 'Unknown account.' };
  rec.plan = plan;
  rec.customPdfs = plan === 'custom' ? customPdfs : undefined;
  rec.customPrice = plan === 'custom' ? customPrice : undefined;
  demoSave(store);
  try {
    const q = JSON.parse(localStorage.getItem('pr:acctquota:v1') || '{}');
    if (q[acc]) {
      q[acc] = { granted: 0, qrGranted: 0, qrUsed: 0 };
      localStorage.setItem('pr:acctquota:v1', JSON.stringify(q));
    }
  } catch {
    /* demo only */
  }
  return { ok: true, plan, price: customPrice, pdfs: customPdfs };
}

export interface RenewalRow {
  username: string;
  fullName?: string;
  phone?: string;
  plan: PlanId;
  customPdfs?: number;
  customPrice?: number;
  daysLeft: number;
  active: boolean;
}

/** Super-admin: paid accounts with subscription status, for renewal reminders. */
export async function getRenewalList(): Promise<RenewalRow[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_renewal_list');
    if (!error && data) {
      return (data as Record<string, unknown>[]).map((r) => ({
        username: String(r.username),
        fullName: r.full_name as string,
        phone: r.phone as string,
        plan: r.plan as PlanId,
        customPdfs: r.custom_pdfs as number,
        customPrice: r.custom_price as number,
        daysLeft: Number(r.days_left) || 0,
        active: Boolean(r.active),
      }));
    }
  }
  // Demo: join localStorage accounts + windows.
  const accounts = demoLoad();
  let windows: Record<string, { validUntil?: number }> = {};
  try {
    windows = JSON.parse(localStorage.getItem('pr:acctquota:v1') || '{}');
  } catch {
    /* ignore */
  }
  const now = Date.now();
  return Object.entries(accounts)
    .filter(([, r]) => r.plan !== 'free')
    .map(([username, r]) => {
      const vu = windows[username]?.validUntil;
      const active = !!vu && vu > now;
      return {
        username,
        fullName: r.fullName,
        phone: r.phone,
        plan: r.plan,
        customPdfs: r.customPdfs,
        customPrice: r.customPrice,
        daysLeft: active ? Math.max(0, Math.ceil((vu! - now) / 86400000)) : 0,
        active,
      };
    });
}

/** Super-admin: list all accounts (no passwords) so a forgotten username can be looked up. */
export async function listAccounts(): Promise<AccountInfo[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('pr_list_accounts');
    if (!error && data) {
      return (data as { username: string; center_name?: string; full_name?: string; plan: string }[]).map(
        (r) => ({
          username: r.username,
          centerName: r.center_name,
          fullName: r.full_name,
          plan: r.plan as PlanId,
        }),
      );
    }
  }
  const store = demoLoad();
  return Object.entries(store).map(([username, r]) => ({
    username,
    centerName: r.centerName,
    fullName: r.fullName,
    plan: r.plan,
  }));
}
