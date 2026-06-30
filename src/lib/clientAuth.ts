/**
 * Plan-aware client login (no real backend — static admin + self-service accounts).
 *
 *  - superadmin / <pass>     → super admin (sees every report, mints codes).
 *  - Free                    → no credentials required.
 *  - Business / Enterprise / Custom → self-service accounts (see lib/accounts.ts),
 *    created on the Create-account page. MindMantra Abacus is just a Custom
 *    subscriber now — it creates its own account like everyone else.
 *
 * Login state is reactive so the header and pages stay in sync.
 */
import { useSyncExternalStore } from 'react';
import { verifyAccount } from './accounts';
import type { PlanId, Role } from './plans';

const KEY = 'pr:auth';

// The only fixed credential left — the super admin.
const ADMIN_USER = 'superadmin';
const ADMIN_PASS = 'super@admin2026';

export interface Session {
  user: string;
  /** null only for the super admin (not tied to a single plan). */
  plan: PlanId | null;
  role: Role;
  /** Effective monthly price (custom accounts) — drives the report's money. */
  price?: number;
  /** Chosen monthly PDF allowance (custom accounts) — drives the quota badge. */
  pdfs?: number;
}

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function load(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let _session: Session | null = load();
const snapshot = () => _session;

function setSession(s: Session): void {
  _session = s;
  localStorage.setItem(KEY, JSON.stringify(s));
  notify();
}

/**
 * Sign in with username + password. The PLAN is derived from the account — no
 * plan picker. The super-admin credential is recognised here too.
 */
export async function signIn(
  username: string,
  password: string,
): Promise<{ ok: boolean; reason?: string }> {
  const id = username.trim().toLowerCase();

  // Super admin (only fixed credential).
  if (id === ADMIN_USER && password === ADMIN_PASS) {
    setSession({ user: ADMIN_USER, plan: null, role: 'superadmin' });
    return { ok: true };
  }
  // Self-service account — plan comes from the stored account.
  const res = await verifyAccount(id, password);
  if (!res.ok) return { ok: false, reason: res.reason ?? 'Incorrect username or password.' };
  setSession({ user: id, plan: res.plan ?? 'business', role: 'user', price: res.price, pdfs: res.pdfs });
  return { ok: true };
}

/** Use the Free plan with no login (account "guest"). */
export function continueFree(): void {
  setSession({ user: 'guest', plan: 'free', role: 'user' });
}

export function isLoggedIn(): boolean {
  return _session != null;
}
export function currentUser(): string | null {
  return _session?.user ?? null;
}
export function currentPlan(): PlanId | null {
  return _session?.plan ?? null;
}
export function currentRole(): Role | null {
  return _session?.role ?? null;
}

/** Update the signed-in session's plan/price/pdfs (after a plan switch). */
export function updateSessionPlan(plan: PlanId, price?: number, pdfs?: number): void {
  if (!_session) return;
  setSession({ ..._session, plan, price, pdfs });
}

export function logout(): void {
  _session = null;
  localStorage.removeItem(KEY);
  notify();
}

/** Reactive login boolean — re-renders on login/logout anywhere. */
export function useIsLoggedIn(): boolean {
  return useSyncExternalStore(subscribe, isLoggedIn, isLoggedIn);
}

/** Reactive full session (user + plan + role). */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/* ----------------- login modal open/close (shared, reactive) -------------- */

let _loginOpen = false;
const loginSnapshot = () => _loginOpen;

export function setLoginOpen(open: boolean): void {
  _loginOpen = open;
  notify();
}
export const openLogin = () => setLoginOpen(true);

export function useLoginOpen(): boolean {
  return useSyncExternalStore(subscribe, loginSnapshot, loginSnapshot);
}
