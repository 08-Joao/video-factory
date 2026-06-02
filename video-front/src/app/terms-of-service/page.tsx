import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Video Factory",
  description: "Terms of Service for Video Factory.",
};

export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="back-link" href="/login">Video Factory</Link>
        <h1>Terms of Service</h1>
        <p className="muted">Last updated: June 2, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          These Terms of Service govern your access to and use of Video Factory, including our website, application,
          services, tools, and related features. By creating an account or using the service, you agree to these Terms.
          If you do not agree, you may not use the service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Video Factory provides tools that help users create, manage, edit, and publish video-related content,
          including scripts, audio, thumbnails, videos, background media, and integrations with third-party platforms.
          Features may change, be added, or be removed over time.
        </p>

        <h2>3. Accounts and Security</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity that
          occurs under your account. You agree to provide accurate information and to notify us if you believe your
          account has been accessed without authorization.
        </p>

        <h2>4. User Content</h2>
        <p>
          You retain ownership of content that you upload, submit, create, or generate through the service. You grant
          Video Factory a limited license to host, process, store, display, modify, and transmit your content as needed
          to provide and improve the service.
        </p>
        <p>
          You are responsible for your content and for ensuring that you have all rights, permissions, and licenses
          needed to use it. You agree not to upload or publish content that is unlawful, infringing, harmful, deceptive,
          abusive, or otherwise violates applicable laws or third-party rights.
        </p>

        <h2>5. Third-Party Services</h2>
        <p>
          The service may connect to third-party platforms, including social media, hosting, analytics, artificial
          intelligence, storage, and payment providers. Your use of third-party services is subject to their own terms,
          policies, and permissions. Video Factory is not responsible for third-party services or for changes made by
          those providers.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>
          You agree not to misuse the service, interfere with its operation, attempt unauthorized access, reverse
          engineer protected parts of the service, abuse platform integrations, distribute malware, or use the service
          to violate laws, intellectual property rights, privacy rights, or platform policies.
        </p>

        <h2>7. Generated Content</h2>
        <p>
          Some features may use automated systems or artificial intelligence to generate or transform content. You are
          responsible for reviewing generated output before publishing or relying on it. We do not guarantee that
          generated content will be accurate, error-free, unique, suitable for your purpose, or compliant with every
          platform rule.
        </p>

        <h2>8. Availability and Changes</h2>
        <p>
          We aim to provide a reliable service, but we do not guarantee uninterrupted availability. We may suspend,
          limit, update, or discontinue any part of the service at any time, including to perform maintenance, address
          security issues, comply with law, or prevent abuse.
        </p>

        <h2>9. Fees and Payments</h2>
        <p>
          If paid features are offered, applicable fees, billing cycles, taxes, cancellation terms, and refund rules
          will be disclosed when you subscribe or purchase. Unless otherwise stated, fees are non-refundable to the
          extent permitted by law.
        </p>

        <h2>10. Intellectual Property</h2>
        <p>
          Video Factory and its software, design, branding, and service materials are owned by us or our licensors and
          are protected by intellectual property laws. Except for rights expressly granted in these Terms, no rights are
          transferred to you.
        </p>

        <h2>11. Termination</h2>
        <p>
          You may stop using the service at any time. We may suspend or terminate access if you violate these Terms,
          create risk for the service or other users, or if required by law or third-party platform requirements.
        </p>

        <h2>12. Disclaimers</h2>
        <p>
          The service is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we
          disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted
          or error-free operation.
        </p>

        <h2>13. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Video Factory will not be liable for indirect, incidental, special,
          consequential, exemplary, or punitive damages, or for lost profits, revenue, data, goodwill, or business
          opportunities arising from your use of the service.
        </p>

        <h2>14. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. The updated version will be posted on this page with a revised
          "Last updated" date. Continued use of the service after changes become effective means you accept the updated
          Terms.
        </p>

        <h2>15. Contact</h2>
        <p>
          If you have questions about these Terms, contact us through the account, support, or contact channels made
          available in the service.
        </p>
      </article>
    </main>
  );
}
