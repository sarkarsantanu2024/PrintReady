import { useState } from 'react';
import { Building2, LockKeyhole, LogIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/clientAuth';
import { resetPassword } from '@/lib/accounts';
import { CreateAccountForm } from '@/pages/public/CreateAccount';
import { toast } from 'sonner';

type Mode = 'signin' | 'create' | 'reset';

/**
 * The auth content shared by the login modal and the /signin page: Sign in,
 * Create account and Forgot-password (reset) — toggled in the same place.
 */
export function AuthPanel({
  onDone,
  initialMode = 'signin',
}: {
  onDone: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  const heading =
    mode === 'signin'
      ? { title: 'Sign in', sub: 'Free needs no login — sign in for a paid plan.' }
      : mode === 'create'
        ? { title: 'Create your institute', sub: 'Set up your login for a paid plan.' }
        : { title: 'Reset password', sub: 'Verify with your username + center name.' };

  return (
    <div>
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{heading.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{heading.sub}</p>
      </div>

      {mode === 'signin' && <SignInForm onDone={onDone} onForgot={() => setMode('reset')} />}
      {mode === 'create' && <CreateAccountForm onDone={onDone} />}
      {mode === 'reset' && <ResetForm onResetDone={() => setMode('signin')} />}

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {mode === 'signin' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('create')}
              className="font-medium text-primary hover:underline"
            >
              Create Account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function SignInForm({ onDone, onForgot }: { onDone: () => void; onForgot: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await signIn(username, password);
    setBusy(false);
    if (res.ok) {
      setError('');
      onDone();
    } else {
      setError(res.reason ?? 'Incorrect username or password.');
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="signin-username">Username</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-username"
            autoComplete="username"
            placeholder="your username"
            className="pl-9"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            placeholder="password"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        <LogIn className="mr-1.5 h-4 w-4" /> Sign in
      </Button>
    </form>
  );
}

function ResetForm({ onResetDone }: { onResetDone: () => void }) {
  const [username, setUsername] = useState('');
  const [center, setCenter] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    const res = await resetPassword(username, center, password);
    setBusy(false);
    if (res.ok) {
      toast.success('Password reset — sign in with your new password.');
      onResetDone();
    } else {
      setError(res.reason ?? 'Could not reset the password.');
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="reset-username">Username</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reset-username"
            className="pl-9"
            placeholder="your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reset-center">Center name</Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reset-center"
            className="pl-9"
            placeholder="the center name you registered with"
            value={center}
            onChange={(e) => setCenter(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="reset-pw">New password</Label>
          <Input
            id="reset-pw"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm">Confirm</Label>
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        Reset password
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Forgot your username too? Ask your administrator — they can look it up.
      </p>
    </form>
  );
}
