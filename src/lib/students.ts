import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Saved student database — the Enterprise plan's differentiator. Each generated
 * card's details are saved per account so the customer can download student
 * details as CSV. Super admin can export every account's students.
 *
 * Supabase configured → real table (migration 0005). Otherwise → localStorage.
 */

export interface StudentRecord {
  account?: string;
  name: string;
  center: string;
  phone: string;
  address: string;
  guardian: string;
  created_at?: string;
}

const DEMO_KEY = 'pr:students:v1';
type DemoRow = StudentRecord & { account: string; created_at: string };

function demoLoad(): DemoRow[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]') as DemoRow[];
  } catch {
    return [];
  }
}
function demoSave(rows: DemoRow[]): void {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(rows));
  } catch {
    /* demo only */
  }
}

/** Save a batch of students for an account (best-effort). */
export async function saveStudents(account: string, students: StudentRecord[]): Promise<void> {
  if (students.length === 0) return;
  const payload = students.map((s) => ({
    name: s.name,
    center: s.center,
    phone: s.phone,
    address: s.address,
    guardian: s.guardian,
  }));

  if (isSupabaseConfigured) {
    await supabase.rpc('pr_save_students', { p_account: account, p_students: payload });
    return;
  }
  const rows = demoLoad();
  const now = new Date().toISOString();
  for (const s of payload) rows.push({ ...s, account, created_at: now });
  demoSave(rows);
}

/** List students for one account, or every account when `all` is true (super admin). */
export async function listStudents(account: string, all = false): Promise<StudentRecord[]> {
  if (isSupabaseConfigured) {
    const { data } = all
      ? await supabase.rpc('pr_list_students_all')
      : await supabase.rpc('pr_list_students', { p_account: account });
    return (data as StudentRecord[]) ?? [];
  }
  const rows = demoLoad();
  return all ? rows : rows.filter((r) => r.account === account);
}
