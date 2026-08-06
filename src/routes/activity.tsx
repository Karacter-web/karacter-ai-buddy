import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Karacter AI Intent Log" },
      {
        name: "description",
        content:
          "Audit every intent Karacter AI emitted, the arguments it used, and whether the capability executed it.",
      },
      { property: "og:title", content: "Activity — Karacter AI Intent Log" },
      {
        property: "og:description",
        content: "A full audit trail of intents planned and executed by Karacter AI.",
      },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <Activity />
      </AppShell>
    </AuthGate>
  ),
});

type LogRow = {
  id: string;
  capability_id: string | null;
  action: string;
  args: unknown;
  status: string;
  result: string;
  created_at: string;
};

function Activity() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["intent_logs"],
    queryFn: async (): Promise<LogRow[]> => {
      const { data, error } = await supabase
        .from("intent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every intent Karacter emitted and what the capability runtime did with it.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No intents yet. Ask Karacter to do something.
        </p>
      )}

      <ul className="space-y-2">
        {data.map((row) => (
          <li key={row.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <code className="text-xs">
                {row.capability_id}.{row.action}
              </code>
              <Badge
                variant={row.status === "done" ? "default" : "secondary"}
                className="ml-auto text-[10px]"
              >
                {row.status}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {JSON.stringify(row.args)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{row.result}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {new Date(row.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
