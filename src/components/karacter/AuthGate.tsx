import { ShieldCheck } from "lucide-react";

import { useSession } from "@/hooks/useSession";
import { AuthForm } from "./AuthForm";
import { LegalLinks } from "./LegalLinks";

/**
 * Wraps a protected surface. While the session is resolving we show a quiet
 * placeholder; once resolved the decision is final for the render pass, so the
 * assistant never flickers between "signed in" and "signed out".
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();

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

        <AuthForm />

        <LegalLinks className="mt-6" />
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Pre-release developer software — provided without guarantees.
        </p>
      </div>
    </div>
  );
}
