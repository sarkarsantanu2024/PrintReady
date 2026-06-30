import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ShieldX, XCircle } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { verifyCard, type VerifyResult } from '@/lib/idcard/verify';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'done'; result: VerifyResult };

/**
 * PUBLIC card-verification page (`/verify/:code`). Scanned from a printed card's
 * QR — no login. Shows the holder's photo + name + org and whether the card is
 * VALID, REVOKED, or NOT FOUND so a guard can confirm it's genuine.
 */
export default function Verify() {
  const { code = '' } = useParams();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    verifyCard(code)
      .then((result) => alive && setState({ status: 'done', result }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [code]);

  const valid = state.status === 'done' && state.result.found && !state.result.revoked;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <Logo />

      <div className="w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Status banner */}
        <div
          className={[
            'flex items-center gap-3 px-5 py-4 text-white',
            state.status === 'loading' || state.status === 'error'
              ? 'bg-slate-500'
              : valid
                ? 'bg-emerald-600'
                : 'bg-red-600',
          ].join(' ')}
        >
          <StatusIcon state={state} valid={valid} />
          <div>
            <p className="text-base font-bold leading-tight">
              <StatusTitle state={state} valid={valid} />
            </p>
            <p className="text-xs opacity-90">PrintReady verified ID</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {state.status === 'loading' && (
            <p className="text-center text-sm text-muted-foreground">Checking card…</p>
          )}

          {state.status === 'error' && (
            <p className="text-center text-sm text-muted-foreground">
              Couldn't reach the verification server. Check your connection and try again.
            </p>
          )}

          {state.status === 'done' && !state.result.found && (
            <p className="text-center text-sm text-muted-foreground">
              No card matches code <span className="font-mono font-semibold">{code}</span>. This
              card is not genuine or was never issued.
            </p>
          )}

          {state.status === 'done' && state.result.found && (
            <div className="flex gap-4">
              {state.result.photo ? (
                <img
                  src={state.result.photo}
                  alt={state.result.name || 'Cardholder'}
                  className="h-24 w-20 flex-none rounded-md border object-cover"
                />
              ) : (
                <div className="flex h-24 w-20 flex-none items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                  No photo
                </div>
              )}
              <dl className="min-w-0 space-y-1.5 text-sm">
                <Field label="Name" value={state.result.name} />
                <Field label="Organisation" value={state.result.org} />
                <Field label="Card code" value={state.result.code} mono />
                {state.result.revoked && (
                  <p className="pt-1 text-xs font-semibold text-red-600">
                    This card has been revoked by the issuer.
                  </p>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Verification is provided by the card issuer via PrintReady. A genuine card always resolves
        to this page with a matching photo.
      </p>
    </div>
  );
}

function StatusIcon({ state, valid }: { state: State; valid: boolean }) {
  if (state.status === 'loading') return <Loader2 className="h-7 w-7 animate-spin" />;
  if (state.status === 'error') return <ShieldX className="h-7 w-7" />;
  if (valid) return <CheckCircle2 className="h-7 w-7" />;
  return <XCircle className="h-7 w-7" />;
}

function StatusTitle({ state, valid }: { state: State; valid: boolean }) {
  if (state.status === 'loading') return <>Verifying…</>;
  if (state.status === 'error') return <>Couldn't verify</>;
  if (valid) return <>VALID</>;
  if (state.status === 'done' && state.result.found && state.result.revoked) return <>REVOKED</>;
  return <>NOT VALID</>;
}

function Field({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 flex-none text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={['min-w-0 break-words font-medium', mono ? 'font-mono' : ''].join(' ')}>
        {value || '—'}
      </dd>
    </div>
  );
}
