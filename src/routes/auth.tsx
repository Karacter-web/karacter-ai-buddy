import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

import { AuthForm } from "@/components/karacter/AuthForm";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in to Karacter AI" },
      {
        name: "description",
        content:
          "Sign in or create a Karacter AI account to start using the voice assistant and connect your capabilities.",
      },
      { property: "og:title", content: "Sign in to Karacter AI" },
      {
        property: "og:description",
        content: "Authenticate with email or Google and your assistant is ready immediately.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  // Session resolution is async; send the user on as soon as it lands so they
  // never sit on a signed-in auth screen.
  useEffect(() => {
    if (!loading && session) void navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

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

        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
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
