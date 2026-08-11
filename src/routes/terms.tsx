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
    <LegalPage title="Terms of Service" updated="11 August 2026">
      <p>
        By creating an account you agree to these terms. If you do not agree, do not use Karacter
        AI.
      </p>
      <h2>Pre-release software</h2>
      <p>
        Karacter AI is <strong>not a stable release</strong>. It is developer-oriented software
        under active development, not officially rolled out for public consumption, and offered
        with <strong>no guarantee</strong> of availability, correctness or data retention. Features
        and data may change or be removed at any time. See the{" "}
        <strong>Disclaimer &amp; Beta Notice</strong> for the full statement.
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
      <h2>Third parties and your data</h2>
      <p>
        We work with third-party providers (hosting, database, authentication and AI models) to
        deliver the service. We do not sell your data and we do not share your conversations or
        account data with third parties for their own marketing or model-training purposes. See the
        Privacy Policy and GDPR notice.
      </p>
      <h2>Licence</h2>
      <p>
        The Karacter AI source code is released under the MIT License. That licence covers the code
        only; use of this hosted deployment remains governed by these terms.
      </p>
      <h2>Termination</h2>
      <p>
        You may stop using the service at any time. We may suspend accounts that violate these
        terms.
      </p>
      <h2>Contact</h2>
      <p>
        Support and collaboration: support@karacterhub.xyz · Reports: report@karacterhub.xyz ·
        Abuse: abuse@karacterhub.xyz
      </p>
    </LegalPage>
  );
}
