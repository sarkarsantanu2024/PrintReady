import { isSupabaseConfigured, supabase } from './supabase';
import { PLANS, type PlanId } from './plans';

/**
 * Usage history → powers the Report feature with REAL monthly / quarterly /
 * yearly counts. Each generated print-ready PDF is logged (Supabase table
 * pr_usage_log, or a localStorage array in demo mode). Money spent is derived
 * from the plan's monthly price × the number of months that had activity.
 */

export interface MonthBucket {
  period: string; // 'YYYY-MM'
  count: number;
}
export interface PeriodStat {
  pdfs: number;
  activeMonths: number;
  money: number;
}
export interface ReportData {
  months: MonthBucket[];
  month: PeriodStat;
  quarter: PeriodStat;
  year: PeriodStat;
}
export interface AccountReport {
  account: string;
  plan: PlanId;
  report: ReportData;
}

const DEMO_KEY = 'pr:usagelog:v1';
type DemoRow = { account: string; plan: string; ts: number };

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

/** Log one generated PDF against the signed-in account + plan. */
export async function logUsage(account: string, plan: PlanId): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.rpc('pr_log_usage', { p_account: account, p_plan: plan });
    return;
  }
  const rows = demoLoad();
  rows.push({ account, plan, ts: Date.now() });
  demoSave(rows);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Roll monthly buckets up into current month / quarter / year stats + money. */
function summarise(months: MonthBucket[], planMonthly: number): ReportData {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  const qStart = Math.floor(m / 3) * 3;
  const curPeriod = `${y}-${pad(m + 1)}`;

  const stat = (predicate: (period: string, monthIdx: number, year: number) => boolean): PeriodStat => {
    let pdfs = 0;
    let activeMonths = 0;
    for (const b of months) {
      const [by, bm] = b.period.split('-').map(Number);
      if (!by || !bm) continue;
      if (predicate(b.period, bm - 1, by)) {
        pdfs += b.count;
        if (b.count > 0) activeMonths += 1;
      }
    }
    return { pdfs, activeMonths, money: activeMonths * planMonthly };
  };

  return {
    months,
    month: stat((period) => period === curPeriod),
    quarter: stat((_p, monthIdx, year) => year === y && monthIdx >= qStart && monthIdx < qStart + 3),
    year: stat((_p, _monthIdx, year) => year === y),
  };
}

export async function getReport(
  account: string,
  plan: PlanId,
  monthlyOverride?: number,
): Promise<ReportData> {
  const planMonthly = monthlyOverride ?? PLANS[plan]?.monthly ?? 0;
  let months: MonthBucket[];

  if (isSupabaseConfigured) {
    const { data } = await supabase.rpc('pr_usage_report', { p_account: account });
    months = ((data as MonthBucket[]) ?? []).map((r) => ({
      period: r.period,
      count: Number(r.count) || 0,
    }));
  } else {
    const agg = new Map<string, number>();
    for (const r of demoLoad().filter((r) => r.account === account)) {
      const d = new Date(r.ts);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      agg.set(key, (agg.get(key) ?? 0) + 1);
    }
    months = [...agg.entries()].map(([period, count]) => ({ period, count })).sort((a, b) => a.period.localeCompare(b.period));
  }

  return summarise(months, planMonthly);
}

/** This calendar month's PDF count for an account (drives the plan-aware quota badge). */
export async function getMonthUsage(account: string): Promise<number> {
  const r = await getReport(account, 'free');
  return r.month.pdfs;
}

/** Super-admin view: one report per account. */
export async function getReportAll(): Promise<AccountReport[]> {
  const byAccount = new Map<string, { plan: PlanId; months: MonthBucket[] }>();

  if (isSupabaseConfigured) {
    const { data } = await supabase.rpc('pr_usage_report_all');
    for (const r of (data as { account: string; plan: string; period: string; count: number }[]) ?? []) {
      const entry = byAccount.get(r.account) ?? { plan: (r.plan as PlanId) ?? 'free', months: [] };
      entry.plan = (r.plan as PlanId) ?? entry.plan;
      entry.months.push({ period: r.period, count: Number(r.count) || 0 });
      byAccount.set(r.account, entry);
    }
  } else {
    for (const r of demoLoad()) {
      const entry = byAccount.get(r.account) ?? { plan: (r.plan as PlanId) ?? 'free', months: [] };
      const d = new Date(r.ts);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const found = entry.months.find((b) => b.period === key);
      if (found) found.count += 1;
      else entry.months.push({ period: key, count: 1 });
      byAccount.set(r.account, entry);
    }
  }

  return [...byAccount.entries()].map(([account, { plan, months }]) => ({
    account,
    plan,
    report: summarise(
      months.sort((a, b) => a.period.localeCompare(b.period)),
      PLANS[plan]?.monthly ?? 0,
    ),
  }));
}
