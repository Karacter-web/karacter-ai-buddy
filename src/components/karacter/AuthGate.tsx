import { useMemo, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required" })
  .email({ message: "Enter a valid email address" })
  .max(255, { message: "Email must be under 255 characters" });

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be under 72 characters" })
  .regex(/[a-z]/, { message: "Include at least one lowercase letter" })
  .regex(/[A-Z]/, { message: "Include at least one uppercase letter" })
  .regex(/[0-9]/, { message: "Include at least one number" });

function scorePassword(value: string) {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 5);
}

const STRENGTH = [
  { label: "Very weak", tone: "bg-destructive" },
  { label: "Weak", tone: "bg-destructive" },
  { label: "Fair", tone: "bg-amber-500" },
  { label: "Good", tone: "bg-amber-400" },
  { label: "Strong", tone: "bg-primary" },
  { label: "Excellent", tone: "bg-primary" },
];

type Mode = "signin" | "signup" | "forgot";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.17a6.9 6.9 0 0 1 0-4.34V6.85H1.7a11.5 11.5 0 0 0 0 10.3l3.85-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.08c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.62 15.1.5 12 .5A11.5 11.5 0 0 0 1.7 6.85l3.85 2.98C6.46 7.1 9 5.08 12 5.08Z"
      />
    </svg>
  );
}

/**
 * Google sign-in is brokered by Supabase Auth (credentials configured in the
 * Supabase dashboard). Inside an iframe preview Google refuses to render its
 * consent screen, so we hand the URL to a top-level tab instead.
 */
async function signInWithGoogle() {
  const inFrame = typeof window !== "undefined" && window.self !== window.top;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: inFrame,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) {
    toast.error(error.message);
    return;
  }
  if (inFrame && data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
}


export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.issues[0]!.message });
      return;
    }
    const cleanEmail = emailResult.data.toLowerCase();

    if (mode !== "forgot") {
      const passwordResult =
        mode === "signup" ? passwordSchema.safeParse(password) : z.string().min(1, { message: "Password is required" }).safeParse(password);
      if (!passwordResult.success) {
        setErrors({ password: passwordResult.error.issues[0]!.message });
        return;
      }
    }

    if (mode === "signup" && !accepted) {
      setErrors({ terms: "You must accept the Terms of Service and Privacy Policy" });
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your inbox.");
        setMode("signin");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-10 animate-pulse rounded-full bg-primary/30" />
      </div>
    );
  }

  if (session) return <>{children}</>;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Karacter AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your capability-driven voice assistant.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors['email'])}
            />
            {errors['email'] && <p className="text-xs text-destructive">{errors['email']}</p>}
          </div>

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setMode("forgot")}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors['password'])}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {mode === "signup" && password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full",
                          i < strength ? STRENGTH[strength]!.tone : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Password strength: {STRENGTH[strength]!.label}
                  </p>
                </div>
              )}
              {errors['password'] && <p className="text-xs text-destructive">{errors['password']}</p>}
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="accept"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="accept" className="text-xs font-normal leading-relaxed text-muted-foreground">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary underline-offset-2 hover:underline">
                    Terms of Service
                  </Link>
                  ,{" "}
                  <Link to="/privacy" className="text-primary underline-offset-2 hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/cookies" className="text-primary underline-offset-2 hover:underline">
                    Cookies Policy
                  </Link>
                  .
                </Label>
              </div>
              {errors['terms'] && <p className="text-xs text-destructive">{errors['terms']}</p>}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </Button>

          {mode !== "forgot" && (
            <>
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  or
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={busy}
                onClick={signInWithGoogle}
              >
                <GoogleMark />
                Continue with Google
              </Button>
            </>
          )}


          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setErrors({});
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin"
              ? "No account? Sign up"
              : mode === "signup"
                ? "Already have an account? Sign in"
                : "Back to sign in"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link to="/cookies" className="hover:text-foreground">
            Cookies Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
