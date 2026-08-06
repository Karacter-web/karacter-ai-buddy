import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/karacter/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Karacter AI" },
      {
        name: "description",
        content:
          "The rules for using Karacter AI: acceptable use, capability execution, account responsibilities and liability.",
      },
      { property: "og:title", content: "Terms of Service — Karacter AI" },
      {
        property: "og:description",
        content: "Read the terms that govern your use of the Karacter AI assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="6 August 2026">
      <p>
        By creating an account you agree to these terms. If you do not agree, do not use Karacter
        AI.
      </p>
      <h2>Your account</h2>
      <p>
        You are responsible for keeping your credentials secure and for all activity performed under
        your account. You must be old enough to form a binding contract in your jurisdiction.
      </p>
      <h2>Capability execution</h2>
      <p>
        Karacter plans intents and dispatches them to capabilities you have explicitly connected.
        You are responsible for the actions those capabilities perform, including any effect on
        third-party services, files, devices or repositories.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, harmful, or abusive instructions.</li>
        <li>No attempts to bypass authentication, rate limits or another user's data.</li>
        <li>No use of connected capabilities to access systems you are not authorised to access.</li>
      </ul>
      <h2>AI output</h2>
      <p>
        Assistant responses and plans are generated automatically and may be inaccurate. Review
        consequential actions before confirming them. Output is provided without warranty.
      </p>
      <h2>Availability</h2>
      <p>
        The service is provided "as is". We may change, suspend or discontinue features at any time.
      </p>
      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for indirect or consequential loss
        arising from your use of the service or from actions executed by connected capabilities.
      </p>
      <h2>Termination</h2>
      <p>
        You may stop using the service at any time. We may suspend accounts that violate these
        terms.
      </p>
    </LegalPage>
  );
}
