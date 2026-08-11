import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/karacter/LegalPage";

export const Route = createFileRoute("/gdpr")({
  head: () => ({
    meta: [
      { title: "GDPR & Data Compliance — Karacter AI" },
      {
        name: "description",
        content:
          "Karacter AI's GDPR position: lawful bases, your data rights, processors we work with, retention and our do-not-sell commitment.",
      },
      { property: "og:title", content: "GDPR & Data Compliance — Karacter AI" },
      {
        property: "og:description",
        content:
          "Your rights of access, rectification, erasure, portability and objection, and how to exercise them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gdpr,
});

function Gdpr() {
  return (
    <LegalPage title="GDPR & Data Compliance" updated="11 August 2026">
      <p>
        This page explains how Karacter AI approaches the EU/UK General Data Protection Regulation
        and equivalent privacy laws. Karacter is pre-release developer software; test with data you
        are willing to lose.
      </p>

      <h2>Controller</h2>
      <p>
        The operator of this deployment is the data controller. Reach the controller at{" "}
        <a className="text-primary underline" href="mailto:support@karacterhub.xyz">
          support@karacterhub.xyz
        </a>
        .
      </p>

      <h2>What we process and why</h2>
      <ul>
        <li>Account identity (email, auth metadata) — to give you an account. Basis: contract.</li>
        <li>Conversations and intent logs — to run and audit the assistant. Basis: contract.</li>
        <li>
          Assistant memories and biometric signatures — optional personalisation and identity
          features. Basis: your explicit consent, withdrawable at any time.
        </li>
        <li>Integration configuration — to execute capabilities you connect. Basis: contract.</li>
      </ul>

      <h2>Consent</h2>
      <p>
        Optional processing is opt-in. You can review and withdraw each consent from{" "}
        <strong>Settings → Preferences → Consents</strong> at any time. Withdrawing consent stops
        future processing for that purpose; it does not make earlier lawful processing unlawful.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>Access — obtain a copy of the personal data we hold about you.</li>
        <li>Rectification — correct inaccurate profile or memory records.</li>
        <li>Erasure — delete conversations individually, or delete your entire account.</li>
        <li>Portability — request your conversations and profile in a machine-readable format.</li>
        <li>Restriction and objection — ask us to pause or stop a specific processing purpose.</li>
        <li>Complaint — lodge a complaint with your local supervisory authority.</li>
      </ul>
      <p>
        Exercise any right by emailing{" "}
        <a className="text-primary underline" href="mailto:support@karacterhub.xyz">
          support@karacterhub.xyz
        </a>
        . We aim to respond within 30 days.
      </p>

      <h2>Third-party providers</h2>
      <p>
        We work with third-party providers to deliver Karacter&apos;s claims — including managed
        database and authentication hosting, edge hosting/CDN, and AI model providers that generate
        plans and replies. These providers act as processors: they handle data only to perform the
        service requested.
      </p>
      <h2>Do not sell or share my data</h2>
      <p>
        <strong>
          We do not sell, rent, or trade your personal information, and we do not share your
          conversations or account data with third parties for their own marketing, advertising,
          profiling or model-training purposes.
        </strong>{" "}
        No advertising identifiers, data brokers, or cross-context behavioural advertising are
        involved. Under the CCPA/CPRA there is nothing to opt out of, because no sale or sharing
        takes place. Integration secrets are never included in AI prompts.
      </p>

      <h2>International transfers</h2>
      <p>
        Providers may process data outside your country. Where that happens we rely on the
        providers&apos; standard contractual clauses or equivalent safeguards.
      </p>

      <h2>Retention</h2>
      <p>
        Conversations, logs and memories are kept until you delete them or delete your account.
        Deleting your account removes your profile, conversations, memories, consents and
        integration configuration.
      </p>

      <h2>Security</h2>
      <p>
        Data is stored in a managed Postgres database with row-level security, so records are only
        readable by the account that created them, and traffic is encrypted in transit. As
        pre-release software, no security guarantee is offered — report issues to{" "}
        <a className="text-primary underline" href="mailto:report@karacterhub.xyz">
          report@karacterhub.xyz
        </a>
        .
      </p>
    </LegalPage>
  );
}
