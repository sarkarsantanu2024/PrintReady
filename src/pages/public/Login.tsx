import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});
type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, initializing } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get('redirectTo') ?? '/app/upload';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  // Already logged in? Skip the form.
  if (!initializing && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);
    if (error) {
      // Generic message — don't leak whether the email exists.
      toast.error('Invalid credentials. Please try again.');
      return;
    }
    toast.success('Signed in.');
    navigate(redirectTo, { replace: true, state: { from: location.pathname } });
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to keep designing print-ready documents."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            {...register('remember')}
          />
          Remember me
        </label>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Log in
        </Button>
      </form>

      <Divider />
      <GoogleButton redirectTo={redirectTo} />
    </AuthCard>
  );
}

function Divider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-card px-2 text-muted-foreground">or</span>
      </div>
    </div>
  );
}
