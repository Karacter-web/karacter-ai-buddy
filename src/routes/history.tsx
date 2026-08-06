import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { Button } from "@/components/ui/button";
import { deleteConversation, useConversations } from "@/lib/karacter/chat";

export const Route = createFileRoute("/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Conversation History — Karacter AI" },
      {
        name: "description",
        content:
          "Browse, reopen and delete your saved Karacter AI conversations. Every session is stored to your account.",
      },
      { property: "og:title", content: "Conversation History — Karacter AI" },
      {
        property: "og:description",
        content: "Pick up any past Karacter AI session exactly where you left it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <HistoryView />
      </AppShell>
    </AuthGate>
  ),
});

function HistoryView() {
  const { data: conversations = [], isLoading } = useConversations();
  const queryClient = useQueryClient();

  async function remove(id: string) {
    try {
      await deleteConversation(id);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete conversation");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every conversation is saved to your account and survives refreshes.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading conversations…</p>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No conversations yet. Start one from the Assistant.
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <Link
                to="/"
                search={{ c: conversation.id }}
                className="flex min-w-0 items-center gap-3"
              >
                <MessageSquare className="size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{conversation.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(conversation.updated_at).toLocaleString()}
                  </span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${conversation.title}`}
                onClick={() => void remove(conversation.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
