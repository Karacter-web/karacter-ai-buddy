import { createFileRoute } from "@tanstack/react-router";
import { Code2 } from "lucide-react";
import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { StudioPlaceholder } from "@/components/karacter/StudioPlaceholder";

export const Route = createFileRoute("/karacoder")({
  head: () => ({
    meta: [
      { title: "Karacoder — Karacter AI Coding Studio" },
      {
        name: "description",
        content:
          "Karacoder is the planned coding surface of Karacter AI: repo-aware chat, diffs and reviews through authorized developer capabilities.",
      },
      { property: "og:title", content: "Karacoder — Karacter AI Coding Studio" },
      {
        property: "og:description",
        content: "The planned coding studio inside Karacter AI. Not yet available.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <StudioPlaceholder
          name="Karacoder"
          tagline="Code with Karacter"
          description="A repo-aware coding surface that plans changes through the capability registry instead of touching your machine directly."
          icon={Code2}
          planned={[
            "Repository-scoped context",
            "Diff review before execution",
            "GitHub capability wiring",
            "Local agent pairing",
          ]}
        />
      </AppShell>
    </AuthGate>
  ),
});
