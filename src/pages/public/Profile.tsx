import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  FileText,
  LogOut,
  Pencil,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { PublicShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivatePlanModal } from "@/components/pricing/ActivatePlanModal";
import { ManagePlanModal } from "@/components/pricing/ManagePlanModal";
import { EditProfileModal } from "@/components/auth/EditProfileModal";
import { useSession, logout as clientLogout } from "@/lib/clientAuth";
import { PLANS } from "@/lib/plans";
import { getMonthUsage } from "@/lib/usage";
import { useAccountQuota } from "@/lib/accountQuota";
import { getAccountInfo, type AccountDetails } from "@/lib/accounts";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Signed-in user's profile — plan, REAL activated allowance, usage and details. */
export default function Profile() {
  const navigate = useNavigate();
  const session = useSession();
  const [activate, setActivate] = useState(false);
  const [manage, setManage] = useState(false);
  const [edit, setEdit] = useState(false);
  const [freeUsed, setFreeUsed] = useState(0);
  const [info, setInfo] = useState<AccountDetails | null>(null);
  const [infoTick, setInfoTick] = useState(0);

  const isSuper = session?.role === "superadmin";
  const isPaid =
    !!session &&
    session.role === "user" &&
    !!session.plan &&
    session.plan !== "free";
  // Live per-account quota for paid plans (granted = 0 until activated).
  const acct = useAccountQuota(isPaid && session ? session.user : null);

  useEffect(() => {
    let alive = true;
    if (session && !isPaid && !isSuper)
      getMonthUsage(session.user).then((n) => alive && setFreeUsed(n));
    if (session && session.role === "user")
      getAccountInfo(session.user).then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, [session, isPaid, isSuper, infoTick]);

  if (!session) return <Navigate to="/signin" replace />;

  const plan = session.plan ? PLANS[session.plan] : null;
  const planLabel = isSuper ? "Super admin" : (plan?.label ?? "Free");
  const contracted = session.pdfs ?? plan?.pdfs ?? 0; // what the plan offers
  const price = session.price ?? plan?.monthly ?? 0;

  // Real numbers: paid → from account quota; free → built-in allowance.
  const allowance = isPaid ? (acct?.granted ?? 0) : PLANS.free.pdfs;
  const used = isPaid ? (acct?.used ?? 0) : freeUsed;
  const remaining = Math.max(0, allowance - used);
  const activated = !isPaid || allowance > 0;

  const onLogout = () => {
    clientLogout();
    navigate("/", { replace: true });
  };

  return (
    <PublicShell>
      <section className="container max-w-7xl py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-1.5 h-4 w-4" /> Logout
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isSuper ? (
                  <ShieldCheck className="h-7 w-7" />
                ) : (
                  <BadgeCheck className="h-7 w-7" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {info?.fullName || session.user}
                </p>
                <p className="text-sm text-muted-foreground">
                  {planLabel} {isSuper ? "account" : "plan"}
                </p>
              </div>
            </div>
            {!isSuper && (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEdit(true)}
                >
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
                </Button>
                {isPaid && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManage(true)}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" /> Change plan
                  </Button>
                )}
              </div>
            )}
          </div>

          {!isSuper && (
            <>
              {/* Account details */}
              <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Detail
                  label="User ID"
                  value={info?.username ?? session.user}
                />
                <Detail label="Center / company" value={info?.centerName} />
                <Detail label="Business type" value={info?.centerType} />
                <Detail label="Email" value={info?.email} />
                <Detail label="Phone" value={info?.phone} />
                <Detail label="Home address" value={info?.address} />
              </dl>

              {/* Activation notice for paid plans that haven't redeemed a code yet */}
              {isPaid && !activated && (
                <div className="my-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Your plan isn&apos;t active yet. Pay and enter your code to
                    switch on {contracted} PDFs / month.
                  </p>
                  <Button size="sm" onClick={() => setActivate(true)}>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Activate plan
                  </Button>
                </div>
              )}

              <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="PDFs this month" value={String(used)} />
                <Stat
                  label="Monthly allowance"
                  value={activated ? String(allowance) : "Not active"}
                />
                <Stat
                  label="Remaining"
                  value={activated ? String(remaining) : "—"}
                />
                <Stat label="Plan price" value={inr(price)} sub="/mo" />
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What your plan includes
              </p>
              <ul className="space-y-2 text-sm">
                <Feature on icon={<FileText className="h-4 w-4" />}>
                  {contracted} print-ready PDFs / month
                </Feature>
                <Feature on={!!plan?.qr} icon={<QrCode className="h-4 w-4" />}>
                  Verifiable QR cards
                </Feature>
                <Feature
                  on={!!plan?.report}
                  icon={<FileText className="h-4 w-4" />}
                >
                  Generated report
                </Feature>
                <Feature
                  on={!!plan?.studentDb}
                  icon={<Users className="h-4 w-4" />}
                >
                  Saved student database
                </Feature>
              </ul>
            </>
          )}

          {isSuper && (
            <p className="mt-6 text-sm text-muted-foreground">
              You have super-admin access: view every account&apos;s report,
              download CSV & student details, and mint subscription codes from
              the <span className="font-medium text-foreground">Report</span>{" "}
              panel in the header.
            </p>
          )}
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/" className="font-medium text-primary hover:underline">
            ← Back to the generator
          </Link>
        </p>
      </section>

      {isPaid && (
        <>
          <ActivatePlanModal
            open={activate}
            onOpenChange={setActivate}
            session={session}
            onActivated={() => undefined}
          />
          <ManagePlanModal
            open={manage}
            onOpenChange={setManage}
            session={session}
            onChanged={() => setActivate(true)}
          />
        </>
      )}
      {edit && !isSuper && (
        <EditProfileModal
          open={edit}
          onOpenChange={setEdit}
          account={session.user}
          details={info}
          onSaved={() => setInfoTick((t) => t + 1)}
        />
      )}
    </PublicShell>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 sm:border-0 sm:py-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-extrabold">
        {value}
        {sub && (
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}

function Feature({
  on,
  icon,
  children,
}: {
  on?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex items-center gap-2 ${on ? "" : "text-muted-foreground/60 line-through"}`}
    >
      <span className={on ? "text-primary" : "text-muted-foreground/50"}>
        {on ? icon : <X className="h-4 w-4" />}
      </span>
      {children}
    </li>
  );
}
