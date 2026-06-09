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
  Upload,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicShell } from "@/components/layout/AppShell";
import { DropZone } from "@/components/upload/DropZone";
import { IdCardConfig } from "@/components/idcard/IdCardConfig";
import { CardPreview } from "@/components/idcard/CardPreview";
import { CardList } from "@/components/idcard/CardList";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";
import { extractIdCard } from "@/lib/idcard/extract";
import { composeIdCardsPdf } from "@/lib/idcard/compose";
import { type IdCardLayout } from "@/lib/idcard/layout";
import { loadBranding, saveBranding } from "@/lib/idcard/branding";
import type { ExtractedIdCard } from "@/lib/idcard/types";
import { triggerDownload } from "@/lib/download";

const MAX_FILES = 10;
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
/** Free plan: how many PDFs a guest can process at once before the upgrade popup. */
const FREE_PLAN_LIMIT = 20;

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
    price: "₹3200",
    tag: "mo",
    perks: ["150 PDFs / mo", "Login not required", "Priority support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "₹3000",
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
  /** Upgrade popup shown when the free PDF limit is exceeded. */
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  /** Files selected but not yet processed — wait for the Upload button. */
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // Branding (logo + header text/colours) is loaded from the last session so
  // the client never has to re-upload the logo.
  const [layout, setLayout] = useState<IdCardLayout>(loadBranding);

  // Persist branding whenever it changes.
  useEffect(() => {
    saveBranding(layout);
  }, [layout]);

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
    const batch = files.slice(0, FREE_PLAN_LIMIT);
    if (files.length > FREE_PLAN_LIMIT) {
      // Free plan quota reached — let the user pick a paid plan by PDF count.
      setUpgradeOpen(true);
      toast.info(
        `Free plan covers ${FREE_PLAN_LIMIT} PDFs — processing the first ${FREE_PLAN_LIMIT}. Upgrade to do more.`,
      );
    }

    setStep("processing");
    setProgress({ done: 0, total: batch.length });
    setExtracted([]);

    const results: ExtractedIdCard[] = [];
    for (let i = 0; i < batch.length; i++) {
      try {
        const card = await extractIdCard(batch[i]);
        results.push(card);
      } catch (err) {
        toast.error(
          `${batch[i].name}: ${err instanceof Error ? err.message : "extraction failed"}`,
        );
      }
      setProgress({ done: i + 1, total: batch.length });
    }

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
    setStep("generating");
    try {
      const blob = await composeIdCardsPdf(extracted, layout);
      triggerDownload(blob, `print-ready-id-cards-${extracted.length}.pdf`);
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
    setProgress({ done: 0, total: 0 });
    // Keep the saved branding (logo/header) — "Start over" only clears the
    // uploaded cards, not the one-time logo.
    setLayout(loadBranding());
  };

  return (
    <PublicShell>
      {/* Hero */}
      <section className="container py-16 md:py-24">
        {step === "idle" && (
          <>
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Print-engineered output
              </p>
              <h1 className="text-balance text-4xl font-extrabold tracking-tight md:text-6xl">
                Design once.{" "}
                <span className="text-primary">Print perfectly.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
                Drop up to {MAX_FILES} ID-card PDFs. PrintReady extracts the
                photo and details, strips the repetitive header, and lays out
                clean cards on A4 with crop marks — all in your browser.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-3xl">
              <DropZone
                onAccepted={stageFiles}
                maxSizeBytes={MAX_SIZE_BYTES}
                multiple
                accept={{ "application/pdf": [".pdf"] }}
                primaryLabel="Drop your ID-card PDFs here, or click to browse"
                formatsLabel="PDF only — up to 50 MB"
                hint={`Bulk-upload up to ${MAX_FILES} ID-card PDFs at a time. Files are processed entirely in your browser.`}
              />

              {pendingFiles.length > 0 && (
                <div className="mt-4 space-y-3">
                  <ul className="divide-y rounded-xl border bg-card">
                    {pendingFiles.map((f, i) => (
                      <li
                        key={`${f.name}-${f.size}-${i}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate">
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePending(i)}
                          className="text-muted-foreground transition hover:text-destructive"
                          aria-label={`Remove ${f.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingFiles([])}
                    >
                      Clear
                    </Button>
                    <Button size="lg" onClick={() => handleFiles(pendingFiles)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {pendingFiles.length} PDF
                      {pendingFiles.length === 1 ? "" : "s"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
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
                <div className="lg:col-span-5">
                  <IdCardConfig layout={layout} onChange={setLayout} />
                </div>
                <div className="space-y-4 lg:col-span-7">
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

      {/* Differentiators */}
      <section className="border-t bg-muted/30">
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
        <div className="mt-8 text-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/pricing">See full comparison</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex items-center justify-center py-6 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} PrintReady · Design once. Print
            perfectly.
          </p>
        </div>
      </footer>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        context="Free plan limit reached"
        reason={`The Free plan processes ${FREE_PLAN_LIMIT} PDFs at a time with no login. Pick a plan below to process more PDFs each month.`}
      />
    </PublicShell>
  );
}
