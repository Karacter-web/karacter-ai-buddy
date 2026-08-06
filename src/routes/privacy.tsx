import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/karacter/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Karacter AI" },
      {
        name: "description",
        content:
          "How Karacter AI collects, stores and protects your account data, conversations, integration credentials and intent logs.",
      },
      { property: "og:title", content: "Privacy Policy — Karacter AI" },
      {
        property: "og:description",
        content: "Learn what data Karacter AI stores and how you can revoke or delete it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="6 August 2026">
      <p>
        Karacter AI is a capability-driven assistant. This policy explains what we collect, why we
        collect it, and the control you keep over it.
      </p>
      <h2>Data we collect</h2>
      <ul>
        <li>Account data: your email address and authentication metadata.</li>
        <li>Conversations: prompts you type or speak and the assistant's replies.</li>
        <li>Intent logs: the capability, action and arguments Karacter planned and executed.</li>
        <li>Integration configuration: connection settings for capabilities you enable.</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        Your data is used solely to operate the assistant: planning intents against your available
        capabilities, showing your history, and auditing execution. We do not sell your data or use
        it for advertising.
      </p>
      <h2>AI processing</h2>
      <p>
        Prompts and the list of your enabled capabilities are sent to our AI provider to generate a
        plan. Only the text needed for planning is transmitted; integration secrets are never
        included in prompts.
      </p>
      <h2>Storage and security</h2>
      <p>
        Data is stored in a managed Postgres database with row-level security, so records are only
        readable by the account that created them. Traffic is encrypted in transit.
      </p>
      <h2>Your rights</h2>
      <ul>
        <li>Delete individual conversations from the History page at any time.</li>
        <li>Disable or revoke any integration from the Integrations page without redeployment.</li>
        <li>Request full account deletion by contacting support.</li>
      </ul>
      <h2>Device permissions</h2>
      <p>
        Capabilities such as microphone or camera run in your browser and require explicit browser
        permission. Karacter never records audio or video without your action.
      </p>
      <h2>Contact</h2>
      <p>For privacy questions, contact the account owner who operates this deployment.</p>
    </LegalPage>
  );
}
