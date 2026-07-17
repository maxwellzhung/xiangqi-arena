import type { Metadata } from "next";
import { AppPage, PageIntro } from "../components/site-chrome";
export const metadata: Metadata = { title: "Privacy Policy Template" };
export default function PrivacyPage() {
  return (
    <AppPage>
      <PageIntro
        eyebrow="LEGAL TEMPLATE · 17 JULY 2026"
        title="Privacy policy"
        copy="This plain-language template describes the intended MVP data practices. It is not legal advice and must be reviewed by qualified counsel before production use."
      />
      <div className="legal-banner">
        <strong>Professional review required.</strong> This template does not
        claim guaranteed GDPR, UK GDPR, CCPA, or other regulatory compliance.
      </div>
      <article className="legal-copy surface">
        <h2>Information we expect to handle</h2>
        <p>
          Guest identifiers, account references when you sign in, chosen display
          names, game commands, game results, ratings, device and connection
          metadata, and essential security logs.
        </p>
        <h2>Why we use it</h2>
        <p>
          To create and reconnect games, enforce rules, keep clocks
          synchronized, prevent duplicate results, show history and rankings,
          secure the service, and diagnose failures.
        </p>
        <h2>Cookies and local storage</h2>
        <p>
          An essential signed cookie keeps a guest identity across refreshes.
          Device preferences may be stored locally. Production analytics and
          consent choices must be documented before enablement.
        </p>
        <h2>Sharing, retention, and transfers</h2>
        <p>
          Production counsel and operations owners must finalize processor
          lists, regions, retention schedules, deletion workflows,
          international-transfer mechanisms, and lawful bases.
        </p>
        <h2>Your choices</h2>
        <p>
          Account access, correction, deletion, portability, and objection
          processes will be listed here when the production controller and
          contact channels are confirmed.
        </p>
      </article>
    </AppPage>
  );
}
