import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Loader2, Mail, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AppShell } from '@/components/layout/AppShell';
import { DropZone } from '@/components/upload/DropZone';
import { AnalysisCard } from '@/components/upload/AnalysisCard';
import { ConfigPanel } from '@/components/upload/ConfigPanel';
import { QualityWarnings } from '@/components/upload/QualityWarnings';
import { PreviewSheet } from '@/components/upload/PreviewSheet';
import { useAuth } from '@/hooks/useAuth';
import { useIncrementUsage } from '@/hooks/useUsage';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { UpgradeModal } from '@/components/pricing/UpgradeModal';
import { analyzeFile } from '@/lib/upload/analyze';
import { suggestionsFor, type Suggestion } from '@/lib/upload/suggestions';
import { qualityCheck, type QualityNote } from '@/lib/upload/quality-check';
import type { AnalyzedFile } from '@/lib/upload/types';
import {
  generateFromUpload,
  type PrintOptions,
  type UploadedFile,
  suggestGridForSize,
} from '@/lib/pdf';
import { triggerDownload, safeFilename } from '@/lib/download';
import { documentStorage, newDocumentId } from '@/lib/storage/documents';
import type { Plan } from '@/lib/supabase';

const planMaxBytes: Record<Plan, number> = {
  silver: 10 * 1024 * 1024,
  gold: 25 * 1024 * 1024,
  platinum: 50 * 1024 * 1024,
};
const planAllowsMulti: Record<Plan, boolean> = {
  silver: false,
  gold: true,
  platinum: true,
};

type Step = 'idle' | 'analyzing' | 'configuring' | 'generating' | 'done';

export default function UploadPage() {
  const { user, profile } = useAuth();
  const incrementUsage = useIncrementUsage();
  const plan = profile?.plan ?? 'silver';
  const isDesktop = useIsDesktop();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [step, setStep] = useState<Step>('idle');
  const [analyzed, setAnalyzed] = useState<AnalyzedFile | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [notes, setNotes] = useState<QualityNote[]>([]);
  const [options, setOptions] = useState<PrintOptions>({
    pageSize: 'A4',
    orientation: 'portrait',
    bleed: 3,
    cropMarks: true,
    cropMarkStyle: 'corner',
    foldMarks: 'none',
    registrationMarks: false,
    colorBars: false,
    watermark: plan === 'silver' ? 'Made with PrintReady' : null,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>('');

  // Update watermark when plan changes
  useEffect(() => {
    setOptions((o) => ({ ...o, watermark: plan === 'silver' ? 'Made with PrintReady' : null }));
  }, [plan]);

  const reset = () => {
    setStep('idle');
    setAnalyzed(null);
    setSuggestions([]);
    setNotes([]);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultFilename('');
  };

  const handleFiles = async (files: File[]) => {
    const file = files[0]; // multi-file: future enhancement; we process one at a time for MVP
    setStep('analyzing');
    try {
      const result = await analyzeFile(file);
      setAnalyzed(result);
      const sug = suggestionsFor(result);
      setSuggestions(sug);
      setNotes(qualityCheck(result));

      // Always apply the top suggestion — the engine guarantees at least one
      // (auto-fit fallback when no preset matches), so users never land on
      // single-piece-centered by default for a small card.
      if (sug[0]?.apply) {
        applySuggestionToOptions(sug[0], result);
      } else {
        setOptions((o) => ({
          ...o,
          orientation: result.orientation,
          gridLayout: undefined,
        }));
      }

      setStep('configuring');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not analyze file');
      reset();
    }
  };

  const applySuggestionToOptions = (sug: Suggestion, file: AnalyzedFile) => {
    const grid = sug.apply.grid
      ? {
          cols: sug.apply.grid.cols,
          rows: sug.apply.grid.rows,
          // Use the file's actual width/height so landscape cards stay landscape.
          cardWidth: file.widthMm,
          cardHeight: file.heightMm,
          gap: 5,
        }
      : undefined;
    setOptions((o) => ({
      ...o,
      pageSize: sug.apply.pageSize,
      orientation: sug.apply.orientation,
      foldMarks: sug.apply.foldMarks ?? 'none',
      gridLayout: grid,
    }));
  };

  /**
   * Recomputes the densest grid for the current sheet + orientation. Useful
   * when the user changes sheet size or wants to re-pack after manual edits.
   */
  const recomputeBestFit = () => {
    if (!analyzed) return;
    const fit = suggestGridForSize(
      { pageSize: options.pageSize, orientation: options.orientation },
      analyzed.widthMm,
      analyzed.heightMm,
      5,
    );
    if (fit.perSheet < 1) return;
    setOptions((o) => ({
      ...o,
      gridLayout: {
        cols: fit.cols,
        rows: fit.rows,
        cardWidth: analyzed.widthMm,
        cardHeight: analyzed.heightMm,
        gap: 5,
      },
    }));
    toast.success(`Best fit: ${fit.perSheet} per ${options.pageSize} (${fit.cols} × ${fit.rows})`);
  };

  const handleGenerate = async () => {
    if (!analyzed) return;
    setStep('generating');
    try {
      const usage = await incrementUsage(1);
      if (!usage.allowed) {
        toast.error(`Monthly limit reached (${usage.used}/${usage.limit}).`);
        setUpgradeOpen(true);
        setStep('configuring');
        return;
      }

      const source: UploadedFile = {
        file: analyzed.file,
        widthMm: analyzed.widthMm,
        heightMm: analyzed.heightMm,
        bytes: analyzed.embedBytes,
        kind: analyzed.embedKind,
      };
      const blob = await generateFromUpload(source, options);
      const filename = `${safeFilename(analyzed.file.name.replace(/\.[^.]+$/, ''))}-print-ready.pdf`;
      triggerDownload(blob, filename);

      if (user) {
        await documentStorage.save({
          id: newDocumentId(),
          user_id: user.id,
          flow: 'upload',
          title: analyzed.file.name,
          data: {
            widthMm: analyzed.widthMm,
            heightMm: analyzed.heightMm,
            options: { ...options, watermark: undefined },
          },
          created_at: new Date().toISOString(),
        });
      }

      setResultUrl(URL.createObjectURL(blob));
      setResultFilename(filename);
      setStep('done');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF generation failed');
      setStep('configuring');
    }
  };

  const maxBytes = planMaxBytes[plan];
  const multi = planAllowsMulti[plan];

  // Auto-suggest grid for the analyzed file's size when we don't already have one
  const grid = useMemo(() => options.gridLayout, [options.gridLayout]);
  useEffect(() => {
    if (!analyzed || grid) return;
    // If user manually unsets grid, keep single-piece centered.
  }, [analyzed, grid]);

  return (
    <AppShell>
      <section className="container max-w-6xl py-6">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight">Upload your design</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop a PDF or image — we'll analyse it, add print marks, and lay it out for the
            press. Files are processed entirely in your browser.
          </p>
        </header>

        {step === 'idle' && (
          <DropZone
            onAccepted={handleFiles}
            maxSizeBytes={maxBytes}
            multiple={multi}
            hint="Tip: for best results, export at 300 DPI minimum at the final print size."
          />
        )}

        {step === 'analyzing' && (
          <Card className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Analysing your file…
          </Card>
        )}

        {step === 'configuring' && analyzed && (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <AnalysisCard file={analyzed} />

              {suggestions.length > 0 && (
                <Card className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-accent" /> Smart suggestions
                  </h3>
                  <ul className="space-y-2">
                    {suggestions.map((s, i) => (
                      <li key={i} className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => applySuggestionToOptions(s, analyzed)}
                        >
                          Apply
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <QualityWarnings notes={notes} />
            </div>

            <div className="space-y-4 lg:col-span-4">
              <ConfigPanel
                options={options}
                onChange={setOptions}
                plan={plan}
                onBestFit={recomputeBestFit}
              />
              <Button size="lg" className="w-full" onClick={handleGenerate}>
                Generate Print-Ready PDF
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Start over
              </Button>
            </div>

            {isDesktop ? (
              <div className="lg:col-span-3">
                <PreviewSheet file={analyzed} options={options} />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPreviewOpen(true)}
                className="fixed bottom-24 right-4 z-30 h-12 w-12 rounded-full shadow-lg"
                aria-label="Preview sheet"
              >
                <Eye className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {step === 'generating' && (
          <Card className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Composing your print-ready PDF…
          </Card>
        )}

        {step === 'done' && analyzed && (
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 inline-flex rounded-full bg-emerald-500/15 p-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold">Your print-ready PDF is downloading.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tip: cut along the corner marks with a guillotine cutter for the cleanest edge.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Generate another
              </Button>
              {resultUrl && (
                <Button asChild variant="outline">
                  <a
                    href={`mailto:?subject=Print job: ${resultFilename}&body=Hi, please print the attached PDF at 100%25 / actual size.`}
                  >
                    <Mail className="mr-2 h-4 w-4" /> Email to printer
                  </a>
                </Button>
              )}
            </div>
          </Card>
        )}

        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetContent side="bottom" className="h-[90dvh]">
            <div className="h-full overflow-auto pt-2">
              <PreviewSheet file={analyzed} options={options} />
            </div>
          </SheetContent>
        </Sheet>

        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          context="You've hit your monthly limit"
          reason="Upgrade your plan to keep generating print-ready PDFs this month. Plans are month-to-month — cancel anytime."
        />
      </section>
    </AppShell>
  );
}

