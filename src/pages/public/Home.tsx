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
import { ClientLogin } from "@/components/auth/ClientLogin";
import { extractIdCard } from "@/lib/idcard/extract";
import { composeIdCardsPdf } from "@/lib/idcard/compose";
import { type IdCardLayout } from "@/lib/idcard/layout";
import { loadBranding, saveBranding } from "@/lib/idcard/branding";
import type { ExtractedIdCard } from "@/lib/idcard/types";
import { triggerDownload } from "@/lib/download";
import { useIsLoggedIn } from "@/lib/clientAuth";
import {
  consumeOne,
  openTopup,
  QUOTA_ENABLED,
  refreshQuota,
  setQuota,
} from "@/lib/quota";

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

const tiers = [
  {
    name: "Free",
    price: "₹0",
    tag: "Free",
    perks: ["20 PDFs / mo", "No login", "Auto photo + details"],
  },
  {
    name: "Business",
    price: "₹1960",
    tag: "mo",
    perks: ["130 PDFs / mo", "Login not required", "Priority support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "₹4500",
    tag: "mo",
    perks: ["Unlimited PDFs", "Student database", "Dedicated support"],
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

  const handleGenerate = async () => {
    if (extracted.length === 0) return;

    // Each generated + downloaded print-ready PDF counts as ONE against the
    // monthly quota. Re-check the live (server) count, then block if exhausted.
    if (QUOTA_ENABLED) {
      const fresh = await refreshQuota();
      if (fresh.remaining < 1) {
        openTopup();
        toast.error(
          `You've used all ${fresh.limit} print-ready PDFs this month. Buy a top-up to generate more.`,
        );
        return;
      }
    }

    setStep("generating");
    try {
      const blob = await composeIdCardsPdf(extracted, layout);
      triggerDownload(blob, `print-ready-id-cards-${extracted.length}.pdf`);
      // Bill one print-ready PDF only after a successful generate + download.
      if (QUOTA_ENABLED) setQuota(await consumeOne());
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

  if (!authed) {
    return (
      <PublicShell>
        <ClientLogin onSuccess={() => void refreshQuota()} />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
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
              <DropZone
                onAccepted={stageFiles}
                maxSizeBytes={MAX_SIZE_BYTES}
                multiple
                accept={{ "application/pdf": [".pdf"] }}
                primaryLabel="Drop your ID-card PDFs here, or click to browse"
                formatsLabel="PDF only — up to 50 MB"
                hint={`Bulk-upload up to ${MAX_FILES} ID-card PDFs at a time. Files are processed entirely in your browser.`}
              />
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
                <div className="flex gap-2">
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
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.name}
              className={`p-6 ${t.featured ? "border-primary ring-1 ring-primary/30" : ""}`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.name}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {t.price}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  /{t.tag}
                </span>
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
