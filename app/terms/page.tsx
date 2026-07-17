import type { Metadata } from "next";
import { AppPage, PageIntro } from "../components/site-chrome";
export const metadata: Metadata = { title: "Terms of Service Template" };
export default function TermsPage() {
  return (
    <AppPage>
      <PageIntro
        eyebrow="LEGAL TEMPLATE · 17 JULY 2026"
        title="Terms of service"
        copy="This working template covers the intended MVP. It is not legal advice and must be replaced or approved by qualified counsel before production use."
        eyebrowKey="intro.terms.eyebrow"
        titleKey="intro.terms.title"
        copyKey="intro.terms.copy"
      />
      <div className="legal-banner">
        <strong>Professional review required.</strong> Governing law, operator
        identity, age limits, dispute terms, and mandatory consumer rights
        remain to be finalized.
      </div>
      <article className="legal-copy surface">
        <h2>Using Xiangqi Arena</h2>
        <p>
          You may play casual games as a guest. Rated play requires an account.
          You are responsible for lawful use and for activity through your
          account or guest session.
        </p>
        <h2>Fair play</h2>
        <p>
          Do not manipulate clients or protocols, automate play without
          permission, interfere with other games, evade rate limits, impersonate
          people, or exploit service vulnerabilities.
        </p>
        <h2>Availability and changes</h2>
        <p>
          The MVP may change, pause, or lose development data. Production
          service levels, support commitments, and notice periods must be
          separately established.
        </p>
        <h2>Content and conduct</h2>
        <p>
          Public chat, user-uploaded avatars, payments, prizes, and tournaments
          are not part of this MVP. Display names must remain lawful and
          non-abusive.
        </p>
        <h2>Disclaimers and liability</h2>
        <p>
          Production counsel must supply enforceable language appropriate to
          every launch jurisdiction and consumer category.
        </p>
      </article>
    </AppPage>
  );
}
