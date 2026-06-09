import { useState } from 'react';
import { CheckCircle2, LockKeyhole, LogIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/shared/Logo';
import { IdCardArt } from '@/components/idcard/IdCardArt';
import { login } from '@/lib/clientAuth';

interface Props {
  onSuccess: () => void;
}

const PERKS = [
  "Auto-extracts each student's photo + details",
  '10 cards per A4 sheet with crop marks',
  'Everything runs privately in your browser',
];

/** Fixed-credential gate with a branded two-panel layout. */
export function ClientLogin({ onSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      setError('');
      onSuccess();
    } else {
      setError('Incorrect username or password.');
    }
  };

  return (
    <div className="container flex min-h-[calc(100dvh-3.5rem)] items-center justify-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-xl lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between gap-8 bg-gradient-to-br from-primary to-[#a83600] p-8 text-primary-foreground lg:flex">
          <span className="text-xl font-bold tracking-tight">PrintReady</span>

          <div>
            <h2 className="text-2xl font-bold leading-snug">
              Turn ID-card PDFs into clean, print-ready A4 sheets.
            </h2>
            <ul className="mt-5 space-y-2.5 text-sm text-white/90">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white/95 p-4 shadow-lg">
            <IdCardArt className="w-full" />
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-8 sm:p-10">
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo />
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access the ID-card generator.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="username"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
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

            <Button type="submit" className="w-full" size="lg">
              <LogIn className="mr-1.5 h-4 w-4" /> Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Developed by{' '}
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
      </div>
    </div>
  );
}
