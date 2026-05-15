import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface GoogleButtonProps {
  label?: string;
  redirectTo?: string;
}

export function GoogleButton({ label = 'Continue with Google', redirectTo }: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const target = redirectTo
      ? `${window.location.origin}${redirectTo}`
      : `${window.location.origin}/app/upload`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: target },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick} disabled={loading}>
      <GoogleIcon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 11v3.4h5.6c-.24 1.4-1.7 4.1-5.6 4.1-3.36 0-6.1-2.78-6.1-6.2 0-3.42 2.74-6.2 6.1-6.2 1.92 0 3.2.82 3.94 1.52l2.68-2.58C16.96 3.62 14.7 2.6 12 2.6 6.94 2.6 2.86 6.68 2.86 11.74S6.94 20.88 12 20.88c6.92 0 9.14-4.84 9.14-7.34 0-.5-.06-.88-.12-1.24H12z"
      />
    </svg>
  );
}
