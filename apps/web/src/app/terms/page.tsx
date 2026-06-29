import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Posthive",
  description: "Terms governing your use of Posthive.",
};

const LAST_UPDATED = "June 29, 2026";
const CONTACT_EMAIL = "gunasheelan208@gmail.com";

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        .prose h2 { font-size: 20px; font-weight: 600; color: #ededed; margin: 40px 0 12px; letter-spacing: -.01em; }
        .prose h3 { font-size: 15px; font-weight: 600; color: #cfcfcf; margin: 24px 0 8px; }
        .prose p  { font-size: 15px; line-height: 1.75; color: #888; margin-bottom: 14px; }
        .prose ul { padding-left: 20px; margin-bottom: 14px; }
        .prose li { font-size: 15px; line-height: 1.75; color: #888; margin-bottom: 6px; }
        .prose a  { color: #9ba2ee; text-decoration: underline; text-underline-offset: 3px; }
        .prose a:hover { color: #c7caff; }
        .section-divider { border: none; border-top: 1px solid rgba(255,255,255,.06); margin: 0; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,.06)", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/posthivemain.png" alt="Posthive" width={28} height={28} style={{ objectFit: "contain" }} />
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.02em" }}>Posthive</span>
        </Link>
        <Link href="/" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>← Back to home</Link>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 740, margin: "0 auto", padding: "72px 40px 100px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", fontSize: 12, color: "#666", fontFamily: "monospace", marginBottom: 20 }}>
            Last updated: {LAST_UPDATED}
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 16 }}>Terms of Service</h1>
          <p style={{ fontSize: 16, color: "#777", lineHeight: 1.7 }}>
            By using Posthive you agree to these terms. They are written to be readable, not intimidating. If something is unclear, email us.
          </p>
        </div>

        <hr className="section-divider" />

        <div className="prose">
          <h2>1. Acceptance</h2>
          <p>
            By creating an account or using the Posthive service ("Service") you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. If you are using Posthive on behalf of an organisation, you represent that you have authority to bind that organisation.
          </p>

          <h2>2. The Service</h2>
          <p>
            Posthive is a social media scheduling tool that lets you compose, schedule and publish posts to connected social media accounts. The Service is provided "as is" and we reserve the right to modify, suspend or discontinue any part of it at any time with reasonable notice.
          </p>
          <p>
            Posthive is open-source software licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">AGPL-3.0</a>. Your right to use the hosted Service is governed by these Terms, not the AGPL. The AGPL governs your rights to the source code.
          </p>

          <h2>3. Accounts</h2>
          <ul>
            <li>You must be at least 16 years old to create an account.</li>
            <li>You are responsible for keeping your login credentials secure.</li>
            <li>You must provide accurate information when registering.</li>
            <li>One person or entity per account unless you are on the Team plan.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
          </ul>

          <h2>4. Acceptable use</h2>
          <p>You agree not to use Posthive to:</p>
          <ul>
            <li>Post spam, unsolicited messages, or content that violates any platform's own terms of service</li>
            <li>Distribute malware, phishing content, or links to harmful resources</li>
            <li>Harass, threaten, or impersonate any person or entity</li>
            <li>Violate any applicable law or regulation</li>
            <li>Attempt to gain unauthorised access to other accounts or systems</li>
            <li>Use the Service in a way that disrupts or degrades its performance for others</li>
          </ul>
          <p>
            Violation of these rules may result in immediate account suspension or termination without refund.
          </p>

          <h2>5. Social platform compliance</h2>
          <p>
            You are solely responsible for ensuring your use of connected social platforms (Bluesky, Threads, Instagram, LinkedIn, Mastodon) complies with each platform's own terms of service and community guidelines. Posthive is a scheduling tool we do not control and are not responsible for the content you publish.
          </p>

          <h2>6. Billing & subscriptions</h2>
          <h3>Free trial</h3>
          <p>New accounts receive a 14-day free trial with full access to the Creator plan features. No credit card is required to start.</p>

          <h3>Paid plans</h3>
          <p>After the trial, continued use of premium features requires an active paid subscription. Prices are shown in your local currency on the pricing page. All prices are billed monthly and may change with 30 days' notice.</p>

          <h3>Cancellation & refunds</h3>
          <p>
            You may cancel your subscription at any time. Your access continues until the end of the current billing period. We do not offer pro-rata refunds for partial months, except where required by law.
          </p>

          <h3>Self-hosted</h3>
          <p>
            Self-hosted deployments of Posthive are free of charge. These Terms do not apply to self-hosted instances only to the hosted service at posthive.app.
          </p>

          <h2>7. Your content</h2>
          <p>
            You retain all ownership of the content you create and schedule through Posthive. By using the Service you grant Posthive a limited, non-exclusive licence to store and process your content solely for the purpose of providing the Service (i.e. publishing your posts at the scheduled time).
          </p>
          <p>We will never use your content for advertising, training AI models, or any purpose other than delivering the Service.</p>

          <h2>8. Intellectual property</h2>
          <p>
            The Posthive name, logo, and UI design are owned by the Posthive team. The underlying source code is available under AGPL-3.0 see the <a href="https://github.com/AstaBlackClove/posthive" target="_blank" rel="noopener">GitHub repository</a> for details.
          </p>

          <h2>9. Disclaimer of warranties</h2>
          <p>
            The Service is provided <strong style={{ color: "#ededed" }}>"as is"</strong> and <strong style={{ color: "#ededed" }}>"as available"</strong> without warranty of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that posts will be published at the exact scheduled time (though we aim for &lt;1 second accuracy). We are not liable for posts that fail to publish due to third-party API outages.
          </p>

          <h2>10. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Posthive's total liability for any claim arising out of or relating to these Terms or the Service is limited to the amount you paid us in the 3 months preceding the claim. We are not liable for indirect, incidental, special, consequential, or exemplary damages.
          </p>

          <h2>11. Termination</h2>
          <p>
            You may close your account at any time from the Settings page. We may suspend or terminate accounts that violate these Terms. Upon termination, your data will be deleted within 30 days in accordance with our <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <h2>12. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you by email or in-app notice at least 14 days before material changes take effect. Continued use of the Service after that date constitutes acceptance of the new Terms.
          </p>

          <h2>13. Governing law</h2>
          <p>
            These Terms are governed by the laws of India. Any disputes will be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions about these Terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#555" }}>
        <span>© 2026 Posthive. Open source under AGPL-3.0.</span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/privacy" style={{ color: "#777", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: "#9ba2ee" }}>Terms</Link>
        </div>
      </div>
    </div>
  );
}
