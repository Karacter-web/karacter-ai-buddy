import { createFileRoute } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";
import { AppShell } from "@/components/karacter/AppShell";
import { AuthGate } from "@/components/karacter/AuthGate";
import { StudioPlaceholder } from "@/components/karacter/StudioPlaceholder";

export const Route = createFileRoute("/karafoto")({
  head: () => ({
    meta: [
      { title: "Karafoto — Karacter AI Image Studio" },
      {
        name: "description",
        content:
          "Karafoto is the planned image surface of Karacter AI: generate, edit and organize visuals through authorized capabilities.",
      },
      { property: "og:title", content: "Karafoto — Karacter AI Image Studio" },
      {
        property: "og:description",
        content: "The planned image studio inside Karacter AI. Not yet available.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <AppShell>
        <StudioPlaceholder
          name="Karafoto"
          tagline="See with Karacter"
          description="An image workspace for generation, editing and camera capture, gated by the same permission and confirmation rules as every capability."
          icon={ImageIcon}
          planned={[
            "Prompt-to-image generation",
            "Camera capture capability",
            "Edit history and revert",
            "Storage consent controls",
          ]}
        />
      </AppShell>
    </AuthGate>
  ),
});
