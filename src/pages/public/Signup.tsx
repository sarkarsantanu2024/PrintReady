import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase, type Plan } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const signupSchema = z
  .object({
    full_name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
    plan: z.enum(["free", "starter", "business", "pro", "enterprise"]),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
type SignupValues = z.infer<typeof signupSchema>;

const plans: { value: Plan; title: string; copy: string; badge?: string }[] = [
  { value: "free", title: "Free", copy: "₹0 · 20 PDFs / mo" },
  { value: "starter", title: "Starter", copy: "₹699 · 35 PDFs / mo" },
  {
    value: "business",
    title: "Business",
    copy: "₹1960 · 130 PDFs / mo",
    badge: "Popular",
  },
  { value: "pro", title: "Pro", copy: "₹2499 · 170 PDFs / mo" },
  { value: "enterprise", title: "Enterprise", copy: "₹4500 · Unlimited PDFs" },
];

export default function Signup() {
  const navigate = useNavigate();
  const { isAuthenticated, initializing } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
      plan: "free",
    },
  });
  const selectedPlan = watch("plan");

  if (!initializing && isAuthenticated) {
    return <Navigate to="/app/upload" replace />;
  }

  const onSubmit = async (values: SignupValues) => {
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name, plan: values.plan },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled — already signed in.
      toast.success("Welcome to PrintReady!");
      navigate("/app/upload", { replace: true });
    } else {
      toast.success("Check your email to confirm your account.");
      navigate("/login", { replace: true });
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start free — upgrade anytime."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            autoComplete="name"
            placeholder="Asha Kumar"
            {...register("full_name")}
            aria-invalid={!!errors.full_name}
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Min 8 chars"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirm</Label>
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter"
              {...register("confirm_password")}
              aria-invalid={!!errors.confirm_password}
            />
            {errors.confirm_password && (
              <p className="text-xs text-destructive">
                {errors.confirm_password.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Choose a plan</Label>
          <div className="grid gap-2">
            {plans.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() =>
                  setValue("plan", p.value, { shouldValidate: true })
                }
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left text-sm transition",
                  selectedPlan === p.value
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted",
                )}
              >
                <div>
                  <p className="font-medium">
                    {p.title}
                    {p.badge && (
                      <span className="ml-2 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">
                        {p.badge}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.copy}</p>
                </div>
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border-2",
                    selectedPlan === p.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40",
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          <input type="hidden" {...register("plan")} />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={submitting}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <GoogleButton label="Sign up with Google" />
    </AuthCard>
  );
}
