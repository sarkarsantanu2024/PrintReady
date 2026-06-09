import { useState, type ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { BottomNav } from './BottomNav';

/** Wraps authenticated routes with mobile drawer + bottom nav + desktop sidebar. */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar variant="app" onOpenDrawer={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

/** Wraps public/marketing routes with just a top bar. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar variant="public" />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
