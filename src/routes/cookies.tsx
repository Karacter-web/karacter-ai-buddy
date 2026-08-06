import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/karacter/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies Policy — Karacter AI" },
      {
        name: "description",
        content:
          "Which cookies and local storage keys Karacter AI uses for authentication, sidebar state and preferences.",
      },
      { property: "og:title", content: "Cookies Policy — Karacter AI" },
      {
        property: "og:description",
        content: "Karacter AI uses only essential storage — no advertising or tracking cookies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalPage title="Cookies Policy" updated="6 August 2026">
      <p>
        Karacter AI uses a small number of strictly necessary cookies and browser storage keys. We
        do not use advertising, profiling or cross-site tracking cookies.
      </p>
      <h2>Essential storage</h2>
      <ul>
        <li>
          <strong>Authentication session</strong> — stored in local storage so you stay signed in
          between visits.
        </li>
        <li>
          <strong>Sidebar state</strong> — a cookie remembering whether the navigation panel is
          expanded or collapsed.
        </li>
        <li>
          <strong>Preferences</strong> — voice output and notification settings kept on your device.
        </li>
      </ul>
      <h2>No third-party tracking</h2>
      <p>
        We do not embed advertising pixels or analytics that identify you personally across other
        websites.
      </p>
      <h2>Managing storage</h2>
      <p>
        You can clear cookies and local storage from your browser settings at any time. Doing so
        signs you out and resets interface preferences; your conversations remain stored in your
        account.
      </p>
    </LegalPage>
  );
}
