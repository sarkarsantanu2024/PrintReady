import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'printready:install-dismissed-at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isRecentlyDismissed(): boolean {
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (!v) return false;
  const at = Number(v);
  if (Number.isNaN(at)) return false;
  return Date.now() - at < DISMISS_TTL_MS;
}

/** Custom PWA install banner — captures `beforeinstallprompt` and surfaces it. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isRecentlyDismissed()) return;

    const onBefore = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    return () => window.removeEventListener('beforeinstallprompt', onBefore);
  }, []);

  if (!visible || !evt) return null;

  const onInstall = async () => {
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === 'dismissed') {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    setVisible(false);
  };

  const onDismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-3 mb-3 rounded-2xl border bg-card p-4 shadow-lg lg:bottom-4 lg:left-auto lg:right-4 lg:mx-0 lg:max-w-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install PrintReady</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add to your home screen for an app-like experience and offline support.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={onInstall}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
