import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { Toaster } from '@/components/ui/sonner';
import { InstallPrompt } from '@/components/shared/InstallPrompt';
import { Logo } from '@/components/shared/Logo';
import { useAuthBootstrap } from '@/hooks/useAuth';

// Eager: public pages are tiny.
import Home from '@/pages/public/Home';
import Pricing from '@/pages/public/Pricing';
import Login from '@/pages/public/Login';
import Signup from '@/pages/public/Signup';
import ForgotPassword from '@/pages/public/ForgotPassword';
import ResetPassword from '@/pages/public/ResetPassword';
import NotFound from '@/pages/public/NotFound';

// Lazy: app routes pull in pdf-lib / @react-pdf / pdfjs which are heavy.
const Editor = lazy(() => import('@/pages/app/Editor'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-shimmer bg-primary" />
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  useAuthBootstrap();

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* App (protected) */}
        <Route path="/app" element={<Navigate to="/app/editor" replace />} />
        <Route path="/app/upload" element={<Navigate to="/" replace />} />
        <Route
          path="/app/editor"
          element={
            <RequireAuth>
              <Suspense fallback={<RouteFallback />}>
                <Editor />
              </Suspense>
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRoutes />
            <Toaster />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
