/**
 * Minimal fixed-credential login for the single client (no backend).
 * Credentials are intentionally hard-coded per the client's request.
 * Login state is reactive so the header and the page stay in sync.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'pr:auth';
const FIXED_USER = 'santanu.sarkar';
const FIXED_PASS = '12345';

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function login(username: string, password: string): boolean {
  if (username.trim().toLowerCase() === FIXED_USER && password === FIXED_PASS) {
    localStorage.setItem(KEY, JSON.stringify({ user: FIXED_USER, at: Date.now() }));
    notify();
    return true;
  }
  return false;
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(KEY);
}

export function currentUser(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw).user as string) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(KEY);
  notify();
}

/** Reactive login state — re-renders on login/logout anywhere in the app. */
export function useIsLoggedIn(): boolean {
  return useSyncExternalStore(subscribe, isLoggedIn, isLoggedIn);
}
