import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createAccount } from '@/lib/accounts';
import { signIn } from '@/lib/clientAuth';
import { PLANS, customPrice, type PlanId } from '@/lib/plans';

/** Plans a customer can self-register for (Free needs no account). */
// Free is included so we capture details for every signup.
const SELF_SERVE: PlanId[] = ['free', 'business', 'enterprise', 'custom'];

const CENTER_TYPES = ['Abacus', 'Coaching center', 'School', 'Gym / fitness', 'Society / club', 'Other'];

/**
 * "Create your institute" form — self-service signup for ALL plans (Free too,
 * so we capture full details). On success the user is signed straight in.
 * Rendered inside the combined Auth page so it toggles with the sign-in form.
 */
export function CreateAccountForm({ onDone }: { onDone: () => void }) {
  const [plan, setPlan] = useState<PlanId>('free');
  const [customPdfs, setCustomPdfs] = useState(130);
  const [centerName, setCenterName] = useState('');
  const [centerType, setCenterType] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || !phone.trim() || !address.trim() || !centerType) {
      return setError('Please fill in name, email, phone, home address and business type.');
    }
    if (password.length < 5) return setError('Password must be at least 5 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    const isCustom = plan === 'custom';
    const res = await createAccount({
      username,
      password,
      plan,
      centerName,
      centerType,
      fullName,
      email,
      phone,
      address,
      customPdfs: isCustom ? customPdfs : undefined,
      customPrice: isCustom ? customPrice(customPdfs) : undefined,
    });
    if (!res.ok) {
      setBusy(false);
      setError(res.reason ?? 'Could not create the account.');
      return;
    }
    // Sign in immediately so they land in the generator on the right plan.
    await signIn(username, password);
    setBusy(false);
    toast.success(`Welcome to PrintReady — ${PLANS[plan].label} plan!`);
    onDone();
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="centerName">Center name</Label>
        <Input
          id="centerName"
          placeholder="e.g. Bright Abacus Academy"
          value={centerName}
          onChange={(e) => setCenterName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="centerType">Center type</Label>
        <select
          id="centerType"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={centerType}
          onChange={(e) => setCenterType(e.target.value)}
          required
        >
          <option value="">Select your center type…</option>
          {CENTER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="plan">Plan</Label>
        <select
          id="plan"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={plan}
          onChange={(e) => setPlan(e.target.value as PlanId)}
        >
          {SELF_SERVE.map((id) => (
            <option key={id} value={id}>
              {id === 'custom'
                ? 'Custom — choose your own volume'
                : `${PLANS[id].label} — ₹${PLANS[id].monthly}/mo · ${PLANS[id].pdfs} PDFs`}
            </option>
          ))}
        </select>
      </div>

      {plan === 'custom' && (
        <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Label htmlFor="customPdfs">PDFs per month</Label>
          <Input
            id="customPdfs"
            type="number"
            min={10}
            max={5000}
            step={10}
            value={customPdfs}
            onChange={(e) => setCustomPdfs(Math.max(10, Number(e.target.value) || 0))}
          />
          <p className="text-sm">
            Your price:{' '}
            <span className="font-bold text-primary">
              ₹{customPrice(customPdfs).toLocaleString('en-IN')}
            </span>
            <span className="text-muted-foreground"> /mo for {customPdfs} PDFs</span>
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Your name</Label>
        <Input
          id="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="e.g. 98xxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Home address</Label>
        <Input
          id="address"
          autoComplete="street-address"
          placeholder="House, street, city, PIN"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          autoComplete="username"
          placeholder="choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
