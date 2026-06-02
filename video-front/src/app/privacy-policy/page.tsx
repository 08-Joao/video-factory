import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Video Factory",
  description: "Privacy Policy for Video Factory.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="back-link" href="/login">Video Factory</Link>
        <h1>Privacy Policy</h1>
        <p className="muted">Last updated: June 2, 2026</p>

        <h2>1. Overview</h2>
        <p>
          This Privacy Policy explains how Video Factory collects, uses, stores, shares, and protects information when
          you use our website, application, services, tools, and related features. By using the service, you acknowledge
          the practices described in this Policy.
        </p>

        <h2>2. Information We Collect</h2>
        <p>
          We may collect information you provide directly, such as your name, email address, login credentials, account
          settings, project information, uploaded files, generated content, background videos, publishing preferences,
          and communications with us.
        </p>
        <p>
          We may also collect technical and usage information, such as IP address, device and browser details, operating
          system, pages viewed, actions taken, timestamps, log data, cookies, authentication tokens, and diagnostic
          information.
        </p>

        <h2>3. Third-Party Platform Data</h2>
        <p>
          If you connect third-party platforms, such as social media or publishing services, we may collect and process
          information necessary to provide the integration. This may include account identifiers, access tokens,
          refresh tokens, channel details, publishing status, uploaded media references, and permissions granted by the
          third-party platform.
        </p>

        <h2>4. How We Use Information</h2>
        <p>
          We use information to provide, operate, secure, and improve the service; create and manage user accounts;
          process projects and media; enable publishing workflows; provide support; troubleshoot errors; prevent abuse;
          comply with legal obligations; and communicate about service updates or account-related matters.
        </p>

        <h2>5. Artificial Intelligence and Media Processing</h2>
        <p>
          The service may send prompts, scripts, audio, images, videos, metadata, or other project content to service
          providers that help generate, transform, store, or analyze content. We use these providers to deliver the
          features you request and to maintain reliable processing.
        </p>

        <h2>6. Cookies and Similar Technologies</h2>
        <p>
          We may use cookies, local storage, and similar technologies to authenticate users, remember preferences,
          maintain sessions, improve performance, and understand service usage. You can control cookies through your
          browser settings, but disabling them may affect service functionality.
        </p>

        <h2>7. How We Share Information</h2>
        <p>
          We may share information with service providers that perform hosting, storage, authentication, analytics,
          content processing, payment processing, customer support, security, and infrastructure services. We may also
          share information when you direct us to publish or transfer content to a third-party platform.
        </p>
        <p>
          We may disclose information if required by law, legal process, platform requirements, or to protect the
          rights, safety, and security of Video Factory, our users, or others. We may transfer information as part of a
          merger, acquisition, financing, reorganization, or sale of assets.
        </p>

        <h2>8. Data Retention</h2>
        <p>
          We keep information for as long as needed to provide the service, maintain accounts, comply with legal
          obligations, resolve disputes, enforce agreements, prevent abuse, and preserve legitimate business records.
          Retention periods may vary depending on the type of information and how it is used.
        </p>

        <h2>9. Security</h2>
        <p>
          We use reasonable administrative, technical, and organizational measures to protect information. However, no
          method of transmission or storage is completely secure, and we cannot guarantee absolute security.
        </p>

        <h2>10. Your Choices and Rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, export, restrict, or object to
          certain processing of your personal information. You may also be able to disconnect third-party integrations
          or revoke permissions through the third-party platform or through the service.
        </p>

        <h2>11. International Data Transfers</h2>
        <p>
          Information may be processed in countries other than where you live. Those countries may have different data
          protection laws. When required, we use appropriate safeguards for international transfers.
        </p>

        <h2>12. Children's Privacy</h2>
        <p>
          The service is not intended for children under the age required by applicable law to use online services. We
          do not knowingly collect personal information from children. If you believe a child has provided personal
          information, contact us so we can take appropriate action.
        </p>

        <h2>13. Links and Third-Party Services</h2>
        <p>
          The service may contain links to third-party websites, apps, or platforms. Their privacy practices are governed
          by their own policies, and we are not responsible for their content or practices.
        </p>

        <h2>14. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The updated version will be posted on this page with a
          revised "Last updated" date. Continued use of the service after changes means you acknowledge the updated
          Policy.
        </p>

        <h2>15. Contact</h2>
        <p>
          If you have questions or requests related to this Privacy Policy, contact us through the account, support, or
          contact channels made available in the service.
        </p>
      </article>
    </main>
  );
}
