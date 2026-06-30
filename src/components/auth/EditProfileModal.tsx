import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile, type AccountDetails } from '@/lib/accounts';

const CENTER_TYPES = ['Abacus', 'Coaching center', 'School', 'Gym / fitness', 'Society / club', 'Other'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: string;
  details: AccountDetails | null;
  onSaved: () => void;
}

/** Subscriber edits their own profile details (name, center, type, email, phone, address). */
export function EditProfileModal({ open, onOpenChange, account, details, onSaved }: Props) {
  const [fullName, setFullName] = useState(details?.fullName ?? '');
  const [centerName, setCenterName] = useState(details?.centerName ?? '');
  const [centerType, setCenterType] = useState(details?.centerType ?? '');
  const [email, setEmail] = useState(details?.email ?? '');
  const [phone, setPhone] = useState(details?.phone ?? '');
  const [address, setAddress] = useState(details?.address ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!fullName.trim() || !email.trim() || !phone.trim() || !address.trim() || !centerType) {
      return setError('Name, email, phone, home address and business type are required.');
    }
    setBusy(true);
    const res = await updateProfile(account, { fullName, centerName, centerType, email, phone, address });
    setBusy(false);
    if (res.ok) {
      toast.success('Profile updated.');
      onOpenChange(false);
      onSaved();
    } else {
      setError(res.reason ?? 'Could not update the profile.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border bg-card p-6 shadow-xl focus:outline-none">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold">Edit profile</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <Field label="Your name" value={fullName} onChange={setFullName} />
            <Field label="Center / company" value={centerName} onChange={setCenterName} />
            <div className="space-y-1.5">
              <Label htmlFor="ep-type">Business type</Label>
              <select
                id="ep-type"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={centerType}
                onChange={(e) => setCenterType(e.target.value)}
              >
                <option value="">Select…</option>
                {CENTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field label="Phone number" type="tel" value={phone} onChange={setPhone} />
            <Field label="Home address" value={address} onChange={setAddress} />

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button className="w-full" size="lg" onClick={save} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save changes
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
