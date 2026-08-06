import { Link, useRouterState } from "@tanstack/react-router";
import { Mic, Plug, ScrollText, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Assistant", icon: Mic },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/activity", label: "Activity", icon: ScrollText },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40">
              <Mic className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">Karacter</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                  pathname === item.to && "bg-secondary text-foreground",
                )}
              >
                <item.icon className="mr-1 inline size-3.5" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">{children}</main>
    </div>
  );
}
