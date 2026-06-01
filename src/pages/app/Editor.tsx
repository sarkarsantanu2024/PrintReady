import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutPicker } from '@/components/editor/LayoutPicker';
import { SingleEntryPanel } from '@/components/editor/SingleEntryPanel';
import { BulkCsvPanel } from '@/components/editor/BulkCsvPanel';
import { UpgradeModal } from '@/components/pricing/UpgradeModal';
import type { LayoutKind } from '@/layouts/types';
import { useAuth } from '@/hooks/useAuth';

export default function Editor() {
  const { user, profile } = useAuth();
  const [layout, setLayout] = useState<LayoutKind>('id_card');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const plan = profile?.plan ?? 'free';

  const onUpgrade = () => setUpgradeOpen(true);

  return (
    <AppShell>
      <section className="container max-w-6xl py-6">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight">Editor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a layout, fill in the form, see the preview update live, then download a
            print-ready PDF with crop marks.
          </p>
        </header>

        <div className="space-y-5">
          <LayoutPicker value={layout} onChange={setLayout} />

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'bulk')}>
            <TabsList>
              <TabsTrigger value="single">Single entry</TabsTrigger>
              <TabsTrigger value="bulk">Bulk CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="single">
              <SingleEntryPanel
                layout={layout}
                userId={user?.id ?? null}
                onUpgradeNeeded={onUpgrade}
              />
            </TabsContent>
            <TabsContent value="bulk">
              <BulkCsvPanel
                layout={layout}
                plan={plan}
                userId={user?.id ?? null}
                onUpgrade={onUpgrade}
              />
            </TabsContent>
          </Tabs>
        </div>

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
