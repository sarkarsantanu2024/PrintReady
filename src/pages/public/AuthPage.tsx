import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { AuthPanel } from '@/components/auth/AuthPanel';

/**
 * Standalone auth PAGE (fallback for /signin and /create-account links). The
 * primary entry point is the header login MODAL; this page reuses the same
 * AuthPanel so behaviour stays identical.
 */
export default function AuthPage({
  initialMode = 'signin',
}: {
  initialMode?: 'signin' | 'create';
}) {
  const navigate = useNavigate();
  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col bg-muted/30">
      <div className="container flex flex-1 flex-col items-center justify-center py-10">
        <Link to="/" className="mb-8">
          <Logo />
        </Link>
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <AuthPanel initialMode={initialMode} onDone={() => navigate('/', { replace: true })} />
        </div>
      </div>
    </div>
  );
}
