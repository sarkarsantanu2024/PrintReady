/**
 * Demo-mode mock of the Supabase JS client. Persists everything to
 * localStorage so the app works end-to-end without a Supabase project.
 *
 * Implements only the API surface PrintReady actually uses:
 *   auth.signUp / signInWithPassword / signInWithOAuth / signOut /
 *     getSession / onAuthStateChange / resetPasswordForEmail / updateUser
 *   from('profiles').select('*').eq('id', uuid).maybeSingle()
 *   rpc('get_usage' | 'increment_usage', args)
 *
 * Cast as `SupabaseClient` at the export site; the real `@supabase/supabase-js`
 * client has many more methods, but the rest of the codebase only touches
 * those listed above.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_LIMITS, type Plan } from './supabase';

// ---------- storage ----------
const K_USERS = 'printready:mock:users';
const K_PROFILES = 'printready:mock:profiles';
const K_SESSION = 'printready:mock:session';
const K_USAGE = 'printready:mock:usage';

interface StoredUser {
  id: string;
  email: string;
  password: string;
}

interface StoredProfile {
  id: string;
  full_name: string | null;
  plan: Plan;
  created_at: string;
}

interface StoredUsage {
  user_id: string;
  period: string; // YYYY-MM
  count: number;
}

interface MockUser {
  id: string;
  email: string;
  user_metadata: { full_name?: string; plan?: Plan };
}

interface MockSession {
  user: MockUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: 'bearer';
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

const period = () => new Date().toISOString().slice(0, 7);
const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `mock-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

// ---------- listeners ----------
type AuthChangeCb = (event: string, session: MockSession | null) => void;
const listeners = new Set<AuthChangeCb>();
function emit(event: string, session: MockSession | null) {
  for (const l of listeners) l(event, session);
}

function buildSession(profile: StoredProfile, email: string): MockSession {
  return {
    user: {
      id: profile.id,
      email,
      user_metadata: { full_name: profile.full_name ?? '', plan: profile.plan },
    },
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    expires_in: 60 * 60 * 24 * 30,
    token_type: 'bearer',
  };
}

// ---------- auth ----------
const auth = {
  async signUp(args: {
    email: string;
    password: string;
    options?: { data?: { full_name?: string; plan?: Plan } };
  }) {
    const users = read<StoredUser[]>(K_USERS, []);
    if (users.find((u) => u.email.toLowerCase() === args.email.toLowerCase())) {
      return { data: { user: null, session: null }, error: { message: 'User already registered' } };
    }
    const id = uuid();
    users.push({ id, email: args.email, password: args.password });
    write(K_USERS, users);

    const profile: StoredProfile = {
      id,
      full_name: args.options?.data?.full_name ?? null,
      plan: args.options?.data?.plan ?? 'free',
      created_at: new Date().toISOString(),
    };
    const profiles = read<StoredProfile[]>(K_PROFILES, []);
    profiles.push(profile);
    write(K_PROFILES, profiles);

    const session = buildSession(profile, args.email);
    write(K_SESSION, session);
    setTimeout(() => emit('SIGNED_IN', session), 0);
    return { data: { user: session.user, session }, error: null };
  },

  async signInWithPassword(args: { email: string; password: string }) {
    const users = read<StoredUser[]>(K_USERS, []);
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === args.email.toLowerCase() && u.password === args.password,
    );
    if (!user) {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      };
    }
    const profiles = read<StoredProfile[]>(K_PROFILES, []);
    const profile = profiles.find((p) => p.id === user.id);
    if (!profile) {
      return {
        data: { user: null, session: null },
        error: { message: 'Profile not found' },
      };
    }
    const session = buildSession(profile, user.email);
    write(K_SESSION, session);
    setTimeout(() => emit('SIGNED_IN', session), 0);
    return { data: { user: session.user, session }, error: null };
  },

  async signInWithOAuth(args: {
    provider: string;
    options?: { redirectTo?: string };
  }) {
    // Demo: silently sign in as a Google demo user with enterprise plan so the
    // demo flows feel uncapped. Persists across page reloads like a real OAuth login.
    const profiles = read<StoredProfile[]>(K_PROFILES, []);
    const id = uuid();
    const email = `google-demo-${id.slice(0, 6)}@printready.demo`;
    const profile: StoredProfile = {
      id,
      full_name: 'Google Demo User',
      plan: 'enterprise',
      created_at: new Date().toISOString(),
    };
    profiles.push(profile);
    write(K_PROFILES, profiles);

    const session = buildSession(profile, email);
    write(K_SESSION, session);
    setTimeout(() => {
      emit('SIGNED_IN', session);
      if (args.options?.redirectTo) window.location.assign(args.options.redirectTo);
    }, 50);
    return { data: { provider: args.provider, url: '' }, error: null };
  },

  async signOut() {
    write(K_SESSION, null);
    setTimeout(() => emit('SIGNED_OUT', null), 0);
    return { error: null };
  },

  async getSession() {
    const session = read<MockSession | null>(K_SESSION, null);
    return { data: { session }, error: null };
  },

  onAuthStateChange(cb: AuthChangeCb) {
    listeners.add(cb);
    return {
      data: {
        subscription: {
          id: uuid(),
          callback: cb,
          unsubscribe: () => {
            listeners.delete(cb);
          },
        },
      },
    };
  },

  async resetPasswordForEmail(_email: string, _opts?: { redirectTo?: string }) {
    void _email;
    void _opts;
    // Always succeed silently — caller never reveals whether the email exists.
    return { data: {}, error: null };
  },

  async updateUser(args: { password?: string }) {
    const session = read<MockSession | null>(K_SESSION, null);
    if (!session) return { data: { user: null }, error: { message: 'No active session' } };
    if (args.password) {
      const users = read<StoredUser[]>(K_USERS, []);
      const idx = users.findIndex((u) => u.id === session.user.id);
      if (idx >= 0) {
        users[idx].password = args.password;
        write(K_USERS, users);
      }
    }
    return { data: { user: session.user }, error: null };
  },
};

// ---------- from('profiles') ----------
class ProfileQuery {
  private filters: Array<(p: StoredProfile) => boolean> = [];

  eq(field: keyof StoredProfile, value: unknown) {
    this.filters.push((p) => p[field] === value);
    return this;
  }

  private exec(): StoredProfile[] {
    const profiles = read<StoredProfile[]>(K_PROFILES, []);
    return profiles.filter((p) => this.filters.every((f) => f(p)));
  }

  async maybeSingle<T = StoredProfile>(): Promise<{ data: T | null; error: null }> {
    const rows = this.exec();
    return { data: (rows[0] as unknown as T) ?? null, error: null };
  }

  async single<T = StoredProfile>(): Promise<{ data: T | null; error: null }> {
    return this.maybeSingle<T>();
  }

  // Make the builder thenable so `await query` works without .single()
  then<T1, T2>(
    onFulfilled?: (value: { data: StoredProfile[]; error: null }) => T1 | PromiseLike<T1>,
    onRejected?: (reason: unknown) => T2 | PromiseLike<T2>,
  ): Promise<T1 | T2> {
    return Promise.resolve({ data: this.exec(), error: null }).then(onFulfilled, onRejected);
  }
}

class FromBuilder {
  constructor(private table: string) {}
  select(_cols?: string) {
    void _cols;
    if (this.table === 'profiles') return new ProfileQuery();
    // Fallback: empty result set
    return {
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }),
    };
  }
}

// ---------- rpc ----------
async function rpc(fn: string, args: Record<string, unknown>) {
  if (fn === 'get_usage') {
    const userId = args.p_user_id as string;
    const profiles = read<StoredProfile[]>(K_PROFILES, []);
    const profile = profiles.find((p) => p.id === userId);
    const plan = profile?.plan ?? 'free';
    const limit = PLAN_LIMITS[plan];
    const usage = read<StoredUsage[]>(K_USAGE, []);
    const u = usage.find((x) => x.user_id === userId && x.period === period());
    return { data: { used: u?.count ?? 0, limit, plan }, error: null };
  }
  if (fn === 'increment_usage') {
    const userId = args.p_user_id as string;
    const count = (args.p_count as number) ?? 1;
    const profiles = read<StoredProfile[]>(K_PROFILES, []);
    const profile = profiles.find((p) => p.id === userId);
    const plan = profile?.plan ?? 'free';
    const limit = PLAN_LIMITS[plan];
    const usage = read<StoredUsage[]>(K_USAGE, []);
    const p = period();
    let u = usage.find((x) => x.user_id === userId && x.period === p);
    if (!u) {
      u = { user_id: userId, period: p, count: 0 };
      usage.push(u);
    }
    if (u.count + count > limit) {
      return {
        data: { allowed: false, used: u.count, limit, requested: count },
        error: null,
      };
    }
    u.count += count;
    write(K_USAGE, usage);
    return {
      data: { allowed: true, used: u.count, limit, requested: count },
      error: null,
    };
  }
  return { data: null, error: { message: `Unknown RPC: ${fn}` } };
}

// ---------- export ----------
const mockClient = {
  auth,
  from: (table: string) => new FromBuilder(table),
  rpc,
};

export function createMockClient(): SupabaseClient {
  // The real SupabaseClient interface is enormous; we only implement what we use.
  return mockClient as unknown as SupabaseClient;
}

/** Useful for the UI to show a "Demo mode" indicator. */
export function isMockClient(client: unknown): boolean {
  return client === (mockClient as unknown);
}
