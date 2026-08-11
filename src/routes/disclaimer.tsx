import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/karacter/LegalPage";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer & Beta Notice — Karacter AI" },
      {
        name: "description",
        content:
          "Karacter AI is pre-release developer software. Read the beta notice, absence of warranty, permission guidance and support contacts before testing.",
      },
      { property: "og:title", content: "Disclaimer & Beta Notice — Karacter AI" },
      {
        property: "og:description",
        content:
          "Karacter AI is under active development and offered without guarantees to developers and testers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Disclaimer,
});

function Disclaimer() {
  return (
    <LegalPage title="Disclaimer & Beta Notice" updated="11 August 2026">
      <h2>This is not a stable release</h2>
      <p>
        Karacter AI is <strong>pre-release software under active development</strong>. It has not
        been officially rolled out for public consumption. It is intended for developers, testers
        and technically capable early adopters who understand that features may be incomplete,
        unstable, or removed without notice.
      </p>
      <h2>No guarantee, no warranty</h2>
      <p>
        The software is provided &quot;as is&quot;, without warranty of any kind, express or
        implied, including but not limited to merchantability, fitness for a particular purpose and
        non-infringement. We do not guarantee availability, accuracy, data durability, or that any
        capability will execute successfully.
      </p>
      <h2>The software will change</h2>
      <ul>
        <li>Interfaces, capabilities and integrations may change or be withdrawn at any time.</li>
        <li>Stored data, conversations and enrolled settings may be reset during development.</li>
        <li>Behaviour in preview builds may differ from production deployments.</li>
      </ul>
      <h2>Be mindful of permissions</h2>
      <p>
        Karacter acts through capabilities you connect. Granting microphone, camera, clipboard,
        notification, location, repository, filesystem or terminal access gives an in-development
        assistant the ability to act on your behalf. Grant only what you are comfortable testing
        with, review actions before confirming them, and revoke access from the Integrations page
        or your browser settings when you are done.
      </p>
      <h2>AI output</h2>
      <p>
        Plans, answers and generated content are produced automatically and may be wrong,
        incomplete or unsafe. Do not rely on Karacter for legal, medical, financial or safety
        critical decisions. You remain responsible for anything executed under your account.
      </p>
      <h2>Reports, contributions, sponsorship and collaboration</h2>
      <p>
        We are open to bug reports, contributions, sponsorship and collaboration — through our
        GitHub repository or by email:
      </p>
      <ul>
        <li>
          General support and collaboration —{" "}
          <a className="text-primary underline" href="mailto:support@karacterhub.xyz">
            support@karacterhub.xyz
          </a>
        </li>
        <li>
          Bug reports and security findings —{" "}
          <a className="text-primary underline" href="mailto:report@karacterhub.xyz">
            report@karacterhub.xyz
          </a>
        </li>
        <li>
          Abuse and misuse —{" "}
          <a className="text-primary underline" href="mailto:abuse@karacterhub.xyz">
            abuse@karacterhub.xyz
          </a>
        </li>
      </ul>
    </LegalPage>
  );
}
