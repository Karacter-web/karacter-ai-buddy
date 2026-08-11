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
    <LegalPage title="Privacy Policy" updated="11 August 2026">
      <p>
        Karacter AI is a capability-driven assistant, currently in pre-release development. This
        policy explains what we collect, why we collect it, and the control you keep over it. See
        also our <strong>GDPR &amp; Data Rights</strong> page and the <strong>Disclaimer</strong>.
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
      <h2>Third-party providers</h2>
      <p>
        To deliver what Karacter promises we rely on third-party providers — managed database and
        authentication hosting, edge hosting and content delivery, and AI model providers that
        generate plans and replies. They process data strictly to perform that service on our
        instruction.
      </p>
      <h2>Do not sell or share my data</h2>
      <p>
        <strong>
          We do not sell, rent or trade your personal information, and we do not share your
          conversations or account data with third parties for their own advertising, profiling or
          model-training purposes.
        </strong>{" "}
        There are no ad pixels, data brokers or cross-context behavioural advertising in Karacter.
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
        readable by the account that created them. Traffic is encrypted in transit. Karacter is
        pre-release software and no security or data-durability guarantee is offered.
      </p>
      <h2>Your rights</h2>
      <ul>
        <li>Delete individual conversations from the History page at any time.</li>
        <li>Disable or revoke any integration from the Integrations page without redeployment.</li>
        <li>Delete your account, or request access, correction or a data export, via support.</li>
      </ul>
      <h2>Device permissions</h2>
      <p>
        Capabilities such as microphone or camera run in your browser and require explicit browser
        permission. Karacter never records audio or video without your action. Because this is a
        product in development, grant only the permissions you are comfortable testing with.
      </p>
      <h2>Contact</h2>
      <ul>
        <li>
          Privacy and support —{" "}
          <a className="text-primary underline" href="mailto:support@karacterhub.xyz">
            support@karacterhub.xyz
          </a>
        </li>
        <li>
          Bug and security reports —{" "}
          <a className="text-primary underline" href="mailto:report@karacterhub.xyz">
            report@karacterhub.xyz
          </a>
        </li>
        <li>
          Abuse —{" "}
          <a className="text-primary underline" href="mailto:abuse@karacterhub.xyz">
            abuse@karacterhub.xyz
          </a>
        </li>
      </ul>
    </LegalPage>
  );
}
