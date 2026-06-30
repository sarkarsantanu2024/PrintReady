import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BarChart3, Download, GraduationCap, Loader2, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { triggerDownload } from '@/lib/download';
import { PLANS, customPrice, type PlanId } from '@/lib/plans';
import { UPI } from '@/lib/payment';
import {
  getReport,
  getReportAll,
  type AccountReport,
  type ReportData,
} from '@/lib/usage';
import { listStudents } from '@/lib/students';
import {
  listAccounts,
  getAccountInfo,
  getRenewalList,
  type AccountInfo,
  type RenewalRow,
} from '@/lib/accounts';
import { getAccountQuota, issueSubscriptionCode } from '@/lib/accountQuota';
import type { Session } from '@/lib/clientAuth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * Usage & spend report. A normal Business/Enterprise/Custom user sees their own
 * monthly / quarterly / yearly PDFs + money spent. The super admin sees every
 * account and can download the whole thing as CSV.
 */
export function ReportModal({ open, onOpenChange, session }: Props) {
  const isAdmin = session.role === 'superadmin';
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<ReportData | null>(null);
  const [all, setAll] = useState<AccountReport[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const work = isAdmin
      ? getReportAll().then((rows) => alive && setAll(rows))
      : getReport(session.user, (session.plan ?? 'free') as PlanId, session.price).then(
          (r) => alive && setMine(r),
        );
    work.finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, isAdmin, session.user, session.plan]);

  const downloadCsv = () => {
    const header = 'account,plan,this_month_pdfs,this_quarter_pdfs,this_year_pdfs,year_money_inr';
    const lines = all.map((a) =>
      [
        a.account,
        a.plan,
        a.report.month.pdfs,
        a.report.quarter.pdfs,
        a.report.year.pdfs,
        a.report.year.money,
      ].join(','),
    );
    const csv = [header, ...lines].join('\n');
    triggerDownload(new Blob([csv], { type: 'text/csv' }), 'printready-report.csv');
  };

  // Enterprise (saved student database) + super admin can export student details.
  const canStudents = isAdmin || (!!session.plan && PLANS[session.plan].studentDb);
  const downloadStudents = async () => {
    const rows = await listStudents(session.user, isAdmin);
    if (rows.length === 0) {
      toast.error('No student details saved yet.');
      return;
    }
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'account,name,center,phone,address,guardian,created_at';
    const lines = rows.map((r) =>
      [r.account ?? session.user, r.name, r.center, r.phone, r.address, r.guardian, r.created_at ?? '']
        .map(esc)
        .join(','),
    );
    triggerDownload(
      new Blob([[header, ...lines].join('\n')], { type: 'text/csv' }),
      'printready-students.csv',
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <Dialog.Title className="text-base font-bold">
                {isAdmin ? 'All-accounts report' : 'Your usage report'}
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-2">
              {canStudents && (
                <Button variant="outline" size="sm" onClick={downloadStudents}>
                  <GraduationCap className="mr-1.5 h-4 w-4" /> Student details
                </Button>
              )}
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
              </div>
            ) : isAdmin ? (
              <AdminReport rows={all} onDownload={downloadCsv} />
            ) : mine ? (
              <UserReport data={mine} planLabel={PLANS[(session.plan ?? 'free') as PlanId].label} />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StatCard({ label, pdfs, money }: { label: string; pdfs: number; money: number }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{pdfs}</p>
      <p className="text-xs text-muted-foreground">PDFs downloaded</p>
      <p className="mt-2 text-sm font-semibold text-primary">{inr(money)} spent</p>
    </div>
  );
}

function UserReport({ data, planLabel }: { data: ReportData; planLabel: string }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Plan: <span className="font-semibold text-foreground">{planLabel}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="This month" pdfs={data.month.pdfs} money={data.month.money} />
        <StatCard label="This quarter" pdfs={data.quarter.pdfs} money={data.quarter.money} />
        <StatCard label="This year" pdfs={data.year.pdfs} money={data.year.money} />
      </div>
      {data.months.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Monthly breakdown
          </p>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2 text-right">PDFs</th>
                </tr>
              </thead>
              <tbody>
                {data.months
                  .slice()
                  .reverse()
                  .map((m) => (
                    <tr key={m.period} className="border-t">
                      <td className="px-3 py-2">{m.period}</td>
                      <td className="px-3 py-2 text-right font-medium">{m.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No PDFs generated yet.</p>
      )}
    </div>
  );
}

/**
 * Super-admin: generate a one-time subscription code FOR a subscriber after
 * confirming their UPI payment (or after they add/change a plan). The subscriber
 * redeems it to activate / top up their monthly allowance.
 */
function ActivatePanel() {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [account, setAccount] = useState('');
  const [pdfs, setPdfs] = useState(0);
  const [qr, setQr] = useState(0);
  const [current, setCurrent] = useState<{ granted: number; used: number; qrGranted: number } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listAccounts().then((a) => {
      if (!alive) return;
      setAccounts(a);
      if (a.length && !account) setAccount(a[0].username);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = accounts.find((a) => a.username === account);

  // When the chosen account changes, load its current allowance AND its real
  // contracted volume (custom subscribers may have changed 130 → 140, etc.) and
  // prefill from THAT — not the plan's nominal default.
  useEffect(() => {
    if (!account) return;
    let alive = true;
    setCode('');
    getAccountQuota(account).then((q) => {
      if (alive) setCurrent({ granted: q.granted, used: q.used, qrGranted: q.qrGranted });
    });
    getAccountInfo(account).then((info) => {
      if (!alive || !info) return;
      const contracted =
        info.plan === 'custom' && info.customPdfs ? info.customPdfs : PLANS[info.plan].pdfs;
      setPdfs(contracted);
      setQr(PLANS[info.plan].qr ? contracted : 0);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const planHasQr = selected ? PLANS[selected.plan].qr : false;

  const generate = async () => {
    if (!account) return;
    setBusy(true);
    const res = await issueSubscriptionCode(account, pdfs, planHasQr ? qr : 0);
    setBusy(false);
    if (res.ok && res.code) {
      setCode(res.code);
      toast.success(`Code generated for ${account}.`);
    } else {
      toast.error(res.reason ?? 'Could not generate the code.');
    }
  };

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="mb-1 text-sm font-semibold">Generate a subscription code</p>
      <p className="mb-3 text-xs text-muted-foreground">
        After the customer pays (or changes plan), generate their code and send it — they redeem it
        to switch on their allowance.
      </p>
      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subscriber accounts yet.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Account</Label>
            <select
              className="h-9 max-w-[12rem] rounded-md border border-input bg-background px-2 text-sm"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.username} · {a.plan}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">PDFs / mo</Label>
            <Input
              type="number"
              min={0}
              step={10}
              className="h-9 w-24"
              value={pdfs}
              onChange={(e) => setPdfs(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          {planHasQr && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">QR cards</Label>
              <Input
                type="number"
                min={0}
                step={10}
                className="h-9 w-24"
                value={qr}
                onChange={(e) => setQr(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          )}
          <Button size="sm" onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Generate code
          </Button>
        </div>
      )}
      {code && (
        <p className="mt-3 text-sm">
          Code for {account}:{' '}
          <button
            type="button"
            className="rounded bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary"
            onClick={() => {
              void navigator.clipboard?.writeText(code);
              toast.success('Copied');
            }}
            title="Click to copy"
          >
            {code}
          </button>{' '}
          <span className="text-xs text-muted-foreground">— click to copy, then send it.</span>
        </p>
      )}
      {current && (
        <p className="mt-2 text-xs text-muted-foreground">
          Current: <span className="font-medium text-foreground">{current.granted}</span> PDFs
          granted · {current.used} used this month
          {planHasQr ? ` · ${current.qrGranted} QR cards` : ''}.
        </p>
      )}
    </div>
  );
}

/** Build a wa.me click-to-send link with a pre-filled renewal reminder. */
function waLink(row: RenewalRow): string | null {
  const digits = (row.phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const phone = digits.length === 10 ? `91${digits}` : digits; // assume India if 10-digit
  const pdfs = row.plan === 'custom' ? (row.customPdfs ?? 0) : PLANS[row.plan].pdfs;
  const price = row.plan === 'custom' ? (row.customPrice ?? customPrice(pdfs)) : PLANS[row.plan].monthly;
  const status = row.active ? `is active — ${row.daysLeft} day${row.daysLeft === 1 ? '' : 's'} left` : 'has expired';
  const msg =
    `Hi ${row.fullName || row.username}, renewal reminder from PrintReady: your ${PLANS[row.plan].label} plan ` +
    `(${pdfs} PDFs/month) ${status}. To renew, pay ₹${price.toLocaleString('en-IN')} to UPI ${UPI.vpa} ` +
    `and we'll re-activate your account. Thank you!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

/** Super-admin: send monthly WhatsApp renewal reminders to paid subscribers. */
function RenewalReminders() {
  const [rows, setRows] = useState<RenewalRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    getRenewalList()
      .then((r) => alive && setRows(r))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Renewal reminders (WhatsApp)</p>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>
      {open && (
        <>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Tap WhatsApp to open a pre-filled renewal message for each subscriber, then send it.
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid subscribers yet.</p>
          ) : (
            <div className="max-h-56 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Subscriber</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Remind</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const link = waLink(r);
                    return (
                      <tr key={r.username} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.fullName || r.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.plan} · {r.phone || 'no phone'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {r.active ? (
                            <span className={r.daysLeft <= 5 ? 'font-medium text-amber-600' : ''}>
                              {r.daysLeft}d left
                            </span>
                          ) : (
                            <span className="font-medium text-red-600">expired</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">no phone</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Super-admin: look up a subscriber's username by name / center (forgot-username support). */
function AccountLookup() {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    listAccounts().then((a) => alive && setAccounts(a));
    return () => {
      alive = false;
    };
  }, []);

  const term = q.trim().toLowerCase();
  const filtered = term
    ? accounts.filter(
        (a) =>
          a.username.toLowerCase().includes(term) ||
          (a.centerName ?? '').toLowerCase().includes(term) ||
          (a.fullName ?? '').toLowerCase().includes(term),
      )
    : accounts;

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Find a subscriber's username</p>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : `Show (${accounts.length})`}
        </Button>
      </div>
      {open && (
        <>
          <Input
            placeholder="Search by username, center or name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-3"
          />
          <div className="max-h-48 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Center</th>
                  <th className="px-3 py-2">Plan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                      No matching accounts.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.username} className="border-t">
                      <td className="px-3 py-2 font-mono font-medium">{a.username}</td>
                      <td className="px-3 py-2">{a.centerName || '—'}</td>
                      <td className="px-3 py-2 capitalize">{a.plan}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AdminReport({ rows, onDownload }: { rows: AccountReport[]; onDownload: () => void }) {
  const totalYear = rows.reduce((s, r) => s + r.report.year.pdfs, 0);
  const totalMoney = rows.reduce((s, r) => s + r.report.year.money, 0);

  return (
    <div className="space-y-4">
      <ActivatePanel />
      <RenewalReminders />
      <AccountLookup />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} account{rows.length === 1 ? '' : 's'} · {totalYear} PDFs this year ·{' '}
          <span className="font-semibold text-primary">{inr(totalMoney)}</span> total
        </p>
        <Button size="sm" variant="outline" onClick={onDownload} disabled={rows.length === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Download CSV
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No usage recorded yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2 text-right">Month</th>
                <th className="px-3 py-2 text-right">Quarter</th>
                <th className="px-3 py-2 text-right">Year</th>
                <th className="px-3 py-2 text-right">Spent (yr)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.account} className="border-t">
                  <td className="max-w-[10rem] truncate px-3 py-2" title={r.account}>
                    {r.account}
                  </td>
                  <td className="px-3 py-2 capitalize">{r.plan}</td>
                  <td className="px-3 py-2 text-right">{r.report.month.pdfs}</td>
                  <td className="px-3 py-2 text-right">{r.report.quarter.pdfs}</td>
                  <td className="px-3 py-2 text-right">{r.report.year.pdfs}</td>
                  <td className="px-3 py-2 text-right font-medium text-primary">
                    {inr(r.report.year.money)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
