import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Karacter
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>
        <div className="prose-invert mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc">
          {children}
        </div>
        <div className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-6 text-[11px] text-muted-foreground">
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
