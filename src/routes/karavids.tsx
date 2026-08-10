import { createFileRoute } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { StudioPlaceholder } from "@/components/karacter/StudioPlaceholder";

export const Route = createFileRoute("/karavids")({
  head: () => ({
    meta: [
      { title: "Karavids — Karacter AI Video Studio" },
      {
        name: "description",
        content:
          "Karavids is the planned video surface of Karacter AI: clips, capture and streaming control through authorized capabilities.",
      },
      { property: "og:title", content: "Karavids — Karacter AI Video Studio" },
      {
        property: "og:description",
        content: "The planned video studio inside Karacter AI. Not yet available.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <StudioPlaceholder
          name="Karavids"
          tagline="Create with Karacter"
          description="A video workspace for clips, screen capture and stream control, routed through explicit device and integration permissions."
          icon={Clapperboard}
          planned={[
            "Clip generation",
            "Screen and camera capture",
            "OBS integration capability",
            "Confirmation before publish",
          ]}
        />
      </AppShell>
    </AuthGate>
  ),
});
