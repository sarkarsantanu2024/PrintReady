import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Lock,
  QrCode,
  RotateCcw,
  Scissors,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicShell } from "@/components/layout/AppShell";
import { DropZone } from "@/components/upload/DropZone";
import { PendingFilesModal } from "@/components/upload/PendingFilesModal";
import {
  UploadAdvisoryModal,
  type UploadAdvisory,
} from "@/components/upload/UploadAdvisoryModal";
import { IdCardConfig } from "@/components/idcard/IdCardConfig";
import { CardPreview } from "@/components/idcard/CardPreview";
import { CardList } from "@/components/idcard/CardList";
import { IdCardArt } from "@/components/idcard/IdCardArt";
import { extractIdCard } from "@/lib/idcard/extract";
import { composeIdCardsPdf } from "@/lib/idcard/compose";
import { type IdCardLayout } from "@/lib/idcard/layout";
import { loadBranding, saveBranding } from "@/lib/idcard/branding";
import type { ExtractedIdCard } from "@/lib/idcard/types";
import {
  genCardCode,
  pngToDataUrl,
  registerCards,
  verifyUrl,
  type CardRecord,
} from "@/lib/idcard/verify";
import { triggerDownload } from "@/lib/download";
import { useIsLoggedIn, useSession, openLogin } from "@/lib/clientAuth";
import { planHasQr, PLANS, type PlanId } from "@/lib/plans";
import { getMonthUsage, logUsage } from "@/lib/usage";
import { saveStudents } from "@/lib/students";
import {
  getAccountQuota,
  useAccountQuota,
  bumpAccountQuota,
} from "@/lib/accountQuota";
import { ActivatePlanModal } from "@/components/pricing/ActivatePlanModal";

const MAX_FILES = 10;
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
/** Above this, we advise the client to upload a lighter PDF next time. */
const ADVISORY_SIZE_BYTES = 3 * 1024 * 1024;

const differentiators = [
  {
    icon: Scissors,
    title: "Print-engineered output",
    body: "Correct dimensions, crop marks, bleed, fold guides — locked at 100% scale.",
  },
  {
    icon: FileText,
    title: "Bulk PDF upload",
    body: "Drop up to 10 ID-card PDFs at once — photos and details are extracted and laid out on A4, ready to cut.",
  },
  {
    icon: Lock,
    title: "Files never leave your browser",
    body: "Everything is processed locally. Privacy and GDPR-friendly by design.",
  },
  {
    icon: Wifi,
    title: "Works offline",
    body: "Install as a PWA, then keep designing — even without a connection.",
  },
];

const tiers: {
  name: string;
  price: string;
  tag?: string;
  perks: string[];
  featured?: boolean;
  badge?: string;
}[] = [
  {
    name: PLANS.free.label,
    price: `₹${PLANS.free.monthly}`,
    tag: "Free",
    perks: PLANS.free.features,
  },
  {
    name: PLANS.business.label,
    price: `₹${PLANS.business.monthly}`,
    tag: "mo",
    perks: PLANS.business.features,
    featured: true,
    badge: "Most popular",
  },
  {
    name: PLANS.enterprise.label,
    price: `₹${PLANS.enterprise.monthly}`,
    tag: "mo",
    perks: PLANS.enterprise.features,
  },
  {
    name: "Customized",
    price: "Custom",
    perks: [
      "Choose your own PDFs / month",
      "Price scales with volume",
      "Generated report",
      "Dedicated support",
    ],
  },
];

type Step = "idle" | "processing" | "review" | "generating" | "done";

export default function Home() {
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [extracted, setExtracted] = useState<ExtractedIdCard[]>([]);
  /** Snapshot of photos as originally extracted, for the "restore" affordance. */
  const [originalPhotos, setOriginalPhotos] = useState<(Uint8Array | null)[]>(
    [],
  );
  /** Which card is shown in the live preview. */
  const [previewIndex, setPreviewIndex] = useState(0);
  /** Whether the client has signed in (fixed-credential gate). */
  const authed = useIsLoggedIn();
  /** Files selected but not yet processed — wait for the Upload button. */
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  /** Per-file advisories (heavy / non-standard PDFs) shown after processing. */
  const [advisories, setAdvisories] = useState<UploadAdvisory[]>([]);
  /** Preview scale (mm→px) — smaller on phones so the 88mm card fits the screen. */
  const [previewPx, setPreviewPx] = useState(4);

  useEffect(() => {
    const update = () =>
      setPreviewPx(
        window.innerWidth < 420 ? 2.8 : window.innerWidth < 768 ? 3.4 : 4,
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // On logout, clear any in-progress work so the next login starts fresh on the
  // upload screen (not the previous review/customise state).
  useEffect(() => {
    if (!authed) {
      setStep("idle");
      setExtracted([]);
      setOriginalPhotos([]);
      setPreviewIndex(0);
      setPendingFiles([]);
      setProgress({ done: 0, total: 0 });
    }
  }, [authed]);
  // Branding (logo + header text/colours) is loaded from the last session so
  // the client never has to re-upload the logo.
  const [layout, setLayout] = useState<IdCardLayout>(loadBranding);

  // Verifiable-QR add-on (paid, separate allowance). Off by default; the client
  // opts in per batch. Each card consumes one QR credit when registered.
  const [qrEnabled, setQrEnabled] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const session = useSession();
  // The QR option only appears for plans that include it (Business / Enterprise).
  const canUseQr = !!session && planHasQr(session.plan);
  // Per-account allowance for paid plans (null for Free / anonymous / super admin).
  const isPaidPlan =
    !!session && session.role === 'user' && !!session.plan && session.plan !== 'free';
  const acctQuota = useAccountQuota(isPaidPlan ? session!.user : null);
  const qrRemaining = acctQuota ? Math.max(0, acctQuota.qrGranted - acctQuota.qrUsed) : 0;
  // A paid plan must be ACTIVATED (allowance > 0) before uploading; Free is fine.
  const planActive = !isPaidPlan || (!!acctQuota && acctQuota.granted > 0);
  const canUpload = authed && planActive;

  // Persist branding whenever it changes.
  useEffect(() => {
    saveBranding(layout);
  }, [layout]);

  // Guard against losing extracted cards on an accidental refresh / tab close
  // while reviewing or generating.
  const hasWorkInProgress =
    step === "review" || step === "generating" || step === "processing";
  useEffect(() => {
    if (!hasWorkInProgress) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasWorkInProgress]);

  const replacePhoto = (index: number, photoPng: Uint8Array | null) => {
    setExtracted((prev) =>
      prev.map((c, i) => (i === index ? { ...c, photoPng } : c)),
    );
  };

  const changeFields = (index: number, fields: ExtractedIdCard["fields"]) => {
    setExtracted((prev) =>
      prev.map((c, i) => (i === index ? { ...c, fields } : c)),
    );
  };

  /**
   * Stage dropped/selected files without processing them. Files with a name
   * already in the list are skipped (a PDF can be added again only under a
   * different name), and the list is capped at MAX_FILES per upload. The user
   * can keep adding differently-named files across multiple drops.
   */
  const stageFiles = (files: File[]) => {
    const merged = [...pendingFiles];
    const duplicates: string[] = [];
    let overflow = 0;

    for (const f of files) {
      if (merged.some((p) => p.name === f.name)) {
        duplicates.push(f.name);
        continue;
      }
      if (merged.length >= MAX_FILES) {
        overflow++;
        continue;
      }
      merged.push(f);
    }

    setPendingFiles(merged);

    if (duplicates.length > 0) {
      toast.error(
        duplicates.length === 1
          ? `"${duplicates[0]}" is already added. Rename the file to upload it again.`
          : `${duplicates.length} files were skipped — a file with the same name is already added.`,
      );
    }
    if (overflow > 0) {
      toast.warning(
        `You can upload up to ${MAX_FILES} PDFs at a time — ${overflow} extra file${
          overflow === 1 ? "" : "s"
        } were skipped.`,
      );
    }
  };

  const removePending = (index: number) =>
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Note: the monthly quota is NOT charged here. Uploading/processing is free
    // — the client is only billed when they actually generate the print-ready
    // PDF (see handleGenerate). So "Start over" before generating costs nothing.
    const batch = files;
    setStep("processing");
    setProgress({ done: 0, total: batch.length });
    setExtracted([]);

    const results: ExtractedIdCard[] = [];
    const advice: UploadAdvisory[] = [];
    for (let i = 0; i < batch.length; i++) {
      const f = batch[i];
      const reasons: UploadAdvisory["reasons"] = [];
      if (f.size > ADVISORY_SIZE_BYTES) reasons.push("oversize");
      try {
        const card = await extractIdCard(f);
        results.push(card);
        // A flattened "Save as PDF"/scanned card (no clean embedded photo) is
        // the irregular format we now handle but want to flag for next time.
        if (card.photoSource !== "embedded") reasons.push("irregular");
      } catch (err) {
        reasons.push("failed");
        toast.error(
          `${f.name}: ${err instanceof Error ? err.message : "extraction failed"}`,
        );
      }
      if (reasons.length > 0) {
        advice.push({ filename: f.name, sizeMB: f.size / (1024 * 1024), reasons });
      }
      setProgress({ done: i + 1, total: batch.length });
    }
    setAdvisories(advice);

    if (results.length === 0) {
      toast.error("No ID cards could be extracted from those files.");
      setStep("idle");
      return;
    }

    setExtracted(results);
    setOriginalPhotos(results.map((r) => r.photoPng));
    setPreviewIndex(0);
    setPendingFiles([]);
    setStep("review");
  };

  // Anonymous visitors are treated as Free (account "guest").
  const effectivePlan: PlanId = session?.plan ?? "free";
  const effectiveAccount = session?.user ?? "guest";

  const handleGenerate = async () => {
    if (extracted.length === 0) return;

    // Quota gate. Paid plans must be ACTIVATED (a redeemed code sets the
    // allowance); Free uses its built-in monthly allowance.
    if (isPaidPlan && session) {
      const q = await getAccountQuota(session.user);
      if (q.granted <= 0) {
        toast.error("Your plan isn't active yet — activate it (pay + code) to generate.");
        setActivateOpen(true);
        return;
      }
      if (q.used >= q.granted) {
        toast.error(`You've used all ${q.granted} print-ready PDFs this month.`);
        setActivateOpen(true);
        return;
      }
    } else {
      const used = await getMonthUsage(effectiveAccount);
      if (used >= PLANS.free.pdfs) {
        toast.error(
          `You've used all ${PLANS.free.pdfs} Free PDFs this month — upgrade to a paid plan for more.`,
        );
        return;
      }
    }

    // Verifiable-QR add-on: register every card against the account's QR
    // allowance BEFORE composing, so an exhausted allowance fails fast.
    let qrUrls: (string | null)[] | undefined;
    if (qrEnabled && canUseQr && session) {
      const q = await getAccountQuota(session.user);
      const left = Math.max(0, q.qrGranted - q.qrUsed);
      if (left < extracted.length) {
        toast.error(
          `Verifiable QR needs ${extracted.length} card credit${
            extracted.length === 1 ? "" : "s"
          }, but only ${left} remain. Activate / top up to continue.`,
        );
        setActivateOpen(true);
        return;
      }
      const codes = extracted.map(() => genCardCode());
      const records: CardRecord[] = extracted.map((card, i) => ({
        code: codes[i],
        name: card.fields.name,
        org: card.fields.centerName || layout.header.companyName,
        photo: pngToDataUrl(card.photoPng),
      }));
      const reg = await registerCards(session.user, records);
      if (!reg.ok) {
        toast.error(reg.reason ?? "Couldn't register the verifiable cards.");
        return;
      }
      qrUrls = codes.map((c) => verifyUrl(c));
    }

    setStep("generating");
    try {
      const blob = await composeIdCardsPdf(extracted, layout, { qrUrls });
      triggerDownload(blob, `print-ready-id-cards-${extracted.length}.pdf`);
      // Record the generation in usage history (drives the quota + report).
      void logUsage(effectiveAccount, effectivePlan);
      // Enterprise (and any studentDb plan) keeps a saved student database.
      if (PLANS[effectivePlan].studentDb) {
        void saveStudents(
          effectiveAccount,
          extracted.map((c) => ({
            name: c.fields.name,
            center: c.fields.centerName,
            phone: c.fields.phone,
            address: c.fields.address,
            guardian: c.fields.guardianName,
          })),
        );
      }
      bumpAccountQuota(); // refresh the header quota badge
      setStep("done");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to compose the print-ready PDF",
      );
      setStep("review");
    }
  };

  const reset = () => {
    setStep("idle");
    setExtracted([]);
    setOriginalPhotos([]);
    setPreviewIndex(0);
    setPendingFiles([]);
    setAdvisories([]);
    setProgress({ done: 0, total: 0 });
    // Keep the saved branding (logo/header) — "Start over" only clears the
    // uploaded cards, not the one-time logo.
    setLayout(loadBranding());
  };

  return (
    <PublicShell>
      {isPaidPlan && session && (
        <ActivatePlanModal
          open={activateOpen}
          onOpenChange={setActivateOpen}
          session={session}
          onActivated={() => undefined}
        />
      )}
      {/* Hero */}
      <section className="container py-16 md:py-24">
        {step === "idle" && (
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Left: copy + illustration */}
            <div className="text-center lg:text-left">
              <p className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Print-engineered output
              </p>
              <h1 className="text-balance text-4xl font-extrabold tracking-tight md:text-5xl">
                Design once.{" "}
                <span className="text-primary">Print perfectly.</span>
              </h1>
              <p className="mt-5 text-pretty text-lg text-muted-foreground">
                Drop up to {MAX_FILES} ID-card PDFs. PrintReady extracts the
                photo and details, strips the repetitive header, and lays out
                clean cards on A4 with crop marks — all in your browser.
              </p>
            </div>

            {/* Right: upload box */}
            <div>
              <div className="relative">
                <DropZone
                  onAccepted={stageFiles}
                  maxSizeBytes={MAX_SIZE_BYTES}
                  multiple
                  accept={{ "application/pdf": [".pdf"] }}
                  disabled={!canUpload}
                  primaryLabel={
                    canUpload
                      ? "Drop your ID-card PDFs here, or click to browse"
                      : !authed
                        ? "Choose a plan to start uploading"
                        : "Activate your plan to start uploading"
                  }
                  formatsLabel="PDF only — up to 50 MB"
                  hint={
                    canUpload
                      ? `Bulk-upload up to ${MAX_FILES} ID-card PDFs at a time. Files are processed entirely in your browser.`
                      : undefined
                  }
                />
                {!canUpload && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card/70 backdrop-blur-[1px]">
                    {!authed ? (
                      <>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Lock className="h-4 w-4" /> Log in and pick a plan to upload
                        </p>
                        <Button size="sm" onClick={openLogin}>
                          Choose your plan
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Free needs no password — just choose Free and continue.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Lock className="h-4 w-4" /> Activate your plan to start uploading
                        </p>
                        <Button size="sm" onClick={() => setActivateOpen(true)}>
                          Activate plan
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Pay via UPI and enter the code from your admin.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-10 lg:hidden">
                <IdCardArt className="mx-auto w-full max-w-xs" />
              </div>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="mx-auto max-w-3xl">
            <Card className="flex flex-col items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p>
                Extracting ID cards… {progress.done} / {progress.total}
              </p>
            </Card>
          </div>
        )}

        {(step === "review" || step === "generating") &&
          extracted.length > 0 && (
            <div className="mx-auto max-w-6xl">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Review & customise — {extracted.length} card
                    {extracted.length === 1 ? "" : "s"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tweak the header, sizes and colours on the left. The preview
                    updates live. Generate when it looks right.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canUseQr && (
                    <label
                      className={[
                        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        qrEnabled
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-input text-muted-foreground hover:bg-muted/50",
                      ].join(" ")}
                      title="Add a unique, scannable verification QR to every card (paid add-on)."
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={qrEnabled}
                        onChange={(e) => setQrEnabled(e.target.checked)}
                        disabled={step === "generating"}
                      />
                      <QrCode className="h-4 w-4" />
                      <span className="font-medium">Verifiable QR</span>
                      <span className="text-xs text-muted-foreground">
                        {qrRemaining} left
                      </span>
                    </label>
                  )}
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <RotateCcw className="mr-1.5 h-4 w-4" /> Start over
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={step === "generating"}
                  >
                    {step === "generating" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Generating…
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" /> Generate
                        print-ready PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {qrEnabled && canUseQr && (
                <p className="mb-6 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  Verifiable QR stores each card's photo, name and organisation
                  on the server so it can be confirmed when scanned — this is the
                  only mode that sends card data out of your browser. Uses{" "}
                  {extracted.length} of your {qrRemaining} remaining QR
                  card credit{extracted.length === 1 ? "" : "s"}.
                </p>
              )}

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="min-w-0 lg:col-span-5">
                  <IdCardConfig layout={layout} onChange={setLayout} />
                </div>
                <div className="min-w-0 space-y-4 lg:col-span-7">
                  <Card className="p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Live preview
                      </h3>
                      {extracted.length > 1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Previous card"
                            disabled={previewIndex <= 0}
                            onClick={() =>
                              setPreviewIndex((i) => Math.max(0, i - 1))
                            }
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="min-w-[3.5rem] text-center text-xs text-muted-foreground">
                            {previewIndex + 1} / {extracted.length}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Next card"
                            disabled={previewIndex >= extracted.length - 1}
                            onClick={() =>
                              setPreviewIndex((i) =>
                                Math.min(extracted.length - 1, i + 1),
                              )
                            }
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center overflow-auto rounded-md bg-muted/30 p-6">
                      <CardPreview
                        layout={layout}
                        sample={extracted[previewIndex]}
                        pxPerMm={previewPx}
                      />
                    </div>
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Showing card {previewIndex + 1} of {extracted.length}. All
                      cards use the same layout.
                    </p>
                  </Card>

                  <CardList
                    cards={extracted}
                    originalPhotos={originalPhotos}
                    onReplacePhoto={replacePhoto}
                    onChangeFields={changeFields}
                  />
                </div>
              </div>
            </div>
          )}

        {step === "done" && (
          <div className="mx-auto max-w-3xl">
            <Card className="p-8 text-center">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-emerald-500/15 p-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold">
                {extracted.length} print-ready ID card
                {extracted.length === 1 ? "" : "s"} downloaded.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tip: print at 100% / actual size and cut along the corner marks.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" onClick={() => setStep("review")}>
                  Edit layout
                </Button>
                <Button onClick={reset}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Process more files
                </Button>
              </div>
            </Card>
          </div>
        )}
      </section>

      {/* Marketing sections only on the landing (upload) screen */}
      {step === "idle" && (
        <>
      {/* Differentiators */}
      <section className="border-t bg-white">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">
              Built for printers, not slideshow apps.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Most design tools export to PDF and call it done. PrintReady
              measures, marks, and lays out for the press.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {differentiators.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-5">
                <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Simple monthly pricing</h2>
          <p className="mt-3 text-muted-foreground">
            Start free. Upgrade only when your team prints more.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <Card
              key={t.name}
              className={`relative p-6 ${t.featured ? "border-primary ring-1 ring-primary/30" : ""}`}
            >
              {t.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {t.badge}
                </span>
              )}
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.name}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {t.price}
                {t.tag && (
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    /{t.tag}
                  </span>
                )}
              </p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{" "}
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center hidden">
          <Button asChild variant="outline" size="lg">
            <Link to="/pricing">See full comparison</Link>
          </Button>
        </div>
      </section>
        </>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-neutral-900 text-neutral-300">
        <div className="container flex flex-col items-center gap-2 py-8 text-center text-sm">
          <p>
            © {new Date().getFullYear()} PrintReady · Design once. Print
            perfectly.
          </p>
          <p>
            Support:{" "}
            <a
              href="tel:+919804243159"
              className="font-medium text-white hover:text-primary"
            >
              9804243159
            </a>
          </p>
          <p className="text-xs text-neutral-400">
            Developed by{" "}
            <a
              href="https://santanu-portfolio-frontend.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Santanu Sarkar
            </a>
          </p>
        </div>
      </footer>

      <PendingFilesModal
        files={pendingFiles}
        onRemove={removePending}
        onClear={() => setPendingFiles([])}
        onUpload={() => {
          const f = pendingFiles;
          setPendingFiles([]);
          void handleFiles(f);
        }}
      />

      <UploadAdvisoryModal advisories={advisories} onClose={() => setAdvisories([])} />
    </PublicShell>
  );
}
