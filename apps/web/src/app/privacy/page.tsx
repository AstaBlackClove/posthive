import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Posthive",
  description: "How Posthive collects, uses, and protects your data.",
};

const LAST_UPDATED = "July 23, 2026";
const CONTACT_EMAIL = "guna@posthive.co";

export default function PrivacyPage() {
  return (
    <div className="mkt" style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ededed", fontFamily: "var(--font-figtree), system-ui, sans-serif" }}>
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
      <div className="px-5 md:px-10" style={{ maxWidth: 740, margin: "0 auto", paddingTop: 72, paddingBottom: 100 }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", fontSize: 12, color: "#666", fontFamily: "monospace", marginBottom: 20 }}>
            Last updated: {LAST_UPDATED}
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-.03em", marginBottom: 16 }}>Privacy Policy</h1>
          <p style={{ fontSize: 16, color: "#777", lineHeight: 1.7 }}>
            Posthive is built with privacy in mind. This policy explains what we collect, why we collect it, and how you can control it. We keep it plain English no legalese walls.
          </p>
        </div>

        <hr className="section-divider" />

        <div className="prose">
          <h2>1. Who we are</h2>
          <p>
            Posthive is an open-source social media scheduling tool licensed under AGPL-3.0. When you use the hosted version at posthive.co, the data controller is the Posthive team. If you self-host Posthive, you are the data controller for your own instance.
          </p>

          <h2>2. What we collect</h2>
          <h3>Account information</h3>
          <p>When you register we collect your email address and a bcrypt-hashed password. We never store your password in plain text.</p>

          <h3>Social account credentials</h3>
          <p>
            OAuth tokens and app passwords (e.g. Bluesky) are stored <strong style={{ color: "#ededed" }}>AES-256-GCM encrypted</strong> in our database. The encryption key is never stored in the database only in the server environment. We cannot read your tokens without the key.
          </p>

          <h3>Post content & media</h3>
          <p>The text and images you schedule are stored so we can publish them at the time you choose. Media files are stored on Supabase Storage (hosted version) or local disk (self-hosted). We do not analyse your content.</p>

          <h3>Usage data</h3>
          <p>We collect basic server logs (IP address, request path, timestamp) for debugging and abuse prevention. These are not sold or shared with third parties.</p>

          <h3>Billing information</h3>
          <p>Payments are handled by <strong style={{ color: "#ededed" }}>Dodo Payments</strong>. We never see or store your card details only a customer ID and subscription status returned by the payment processor.</p>

          <h2>3. What we do not collect</h2>
          <ul>
            <li>We do not use tracking pixels or third-party analytics scripts.</li>
            <li>We do not sell, rent, or trade your data to any third party.</li>
            <li>We do not read or analyse the content of your scheduled posts.</li>
            <li>We do not build advertising profiles.</li>
          </ul>

          <h2>4. How we use your data</h2>
          <ul>
            <li><strong style={{ color: "#cfcfcf" }}>Publishing posts</strong> - your content and credentials are used solely to post on your behalf at the scheduled time.</li>
            <li><strong style={{ color: "#cfcfcf" }}>Authentication</strong> - your email and hashed password authenticate you to the app.</li>
            <li><strong style={{ color: "#cfcfcf" }}>Transactional email</strong> - we send password reset emails via Resend. No marketing email without your consent.</li>
            <li><strong style={{ color: "#cfcfcf" }}>Billing</strong> - subscription status determines which plan features are available to you.</li>
          </ul>

          <h2>5. Data retention</h2>
          <p>
            We keep your data for as long as your account is active. When you delete your account, all personal data including social account credentials and scheduled posts is permanently deleted within 30 days. Anonymised aggregate statistics (total post count etc.) may be retained.
          </p>

          <h2>6. Third-party services</h2>
          <p>The hosted version of Posthive uses the following sub-processors:</p>
          <ul>
            <li><strong style={{ color: "#cfcfcf" }}>Supabase</strong> - database and file storage (EU/US regions)</li>
            <li><strong style={{ color: "#cfcfcf" }}>Upstash / Railway Redis</strong> - job queue</li>
            <li><strong style={{ color: "#cfcfcf" }}>Dodo Payments</strong> - payment processing</li>
            <li><strong style={{ color: "#cfcfcf" }}>Resend</strong> - transactional email</li>
          </ul>
          <p>Each processor has its own privacy policy. We only share the minimum data required for them to perform their service.</p>

          <h2>7. Cookies & local storage</h2>
          <p>
            We use a single HTTP-only cookie to store your session (JWT refresh token). This cookie is strictly necessary for the app to function and does not track you across other sites. We do not use advertising cookies.
          </p>

          <h2>8. Your rights</h2>
          <p>Depending on your jurisdiction you may have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data (right to erasure)</li>
            <li>Export your data in a portable format</li>
            <li>Object to or restrict certain processing</li>
          </ul>
          <p>
            To exercise any of these rights, email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will respond within 30 days.
          </p>

          <h2>9. Security</h2>
          <p>
            We use industry-standard practices: HTTPS everywhere, AES-256-GCM credential encryption, bcrypt password hashing, HTTP-only secure cookies, and rate limiting on auth endpoints. No system is 100% secure if you discover a vulnerability please disclose it responsibly to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2>10. Google API Services — User Data Policy</h2>
          <p>
            Posthive's use of information received from Google APIs adheres to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <h3>What Google data we access</h3>
          <p>
            When you connect a YouTube account, Posthive requests OAuth access to your YouTube channel in order to upload and publish videos on your behalf. Specifically, we access:
          </p>
          <ul>
            <li>Your YouTube channel identity (channel ID and display name) — to identify which channel to post to</li>
            <li>The ability to upload videos and set their metadata (title, description, visibility) — to fulfil scheduled video posts</li>
          </ul>
          <p>We do not access your Gmail, Google Drive, Google Contacts, Google Calendar, or any other Google service.</p>

          <h3>How we use Google data</h3>
          <p>
            Google user data is used <strong style={{ color: "#ededed" }}>exclusively</strong> to publish your scheduled YouTube videos at the time you chose. We do not use it for any other purpose — including advertising, profiling, or any feature unrelated to the scheduling service you requested.
          </p>

          <h3>How we protect Google data</h3>
          <p>
            Your Google OAuth tokens are encrypted at rest using AES-256-GCM with a key stored only in the server environment — never in the database. Tokens are transmitted only over HTTPS and are never logged or returned in API responses.
          </p>

          <h3>Data transfer — Google data</h3>
          <p>
            Your Google OAuth tokens and any associated channel data are <strong style={{ color: "#ededed" }}>never sold, rented, or transferred to any third party</strong>. The only outbound use of your Google credentials is the direct API call to YouTube's servers to publish your scheduled content. No Google user data is shared with advertisers, data brokers, or any other party.
          </p>

          <h3>Data retention and deletion — Google data</h3>
          <p>
            Google OAuth tokens are retained for as long as your YouTube account is connected in Posthive. You can disconnect your YouTube account at any time from the Accounts page — this immediately deletes the stored token from our database. When you delete your Posthive account, all Google OAuth tokens are permanently deleted within 30 days.
          </p>

          <h3>AI and machine learning restrictions</h3>
          <p>
            Posthive does <strong style={{ color: "#ededed" }}>not</strong> use any Google user data — including YouTube channel data or video content — to train, develop, or improve any AI or machine learning model. Google user data is not transferred to any third-party AI or ML service.
          </p>

          <h3>Limited Use compliance statement</h3>
          <p style={{ border: "1px solid #2a2a2a", borderRadius: 10, padding: "16px 20px", background: "#111", color: "#aaa" }}>
            The use of information received from Google APIs will adhere to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <h2>11. Reddit API Data</h2>
          <p>
            Posthive integrates with the Reddit API to allow users to schedule and publish posts to Reddit on their behalf. Our use of the Reddit API complies with the{" "}
            <a href="https://www.redditinc.com/policies/data-api-terms" target="_blank" rel="noreferrer">Reddit Data API Terms</a>{" "}
            and the{" "}
            <a href="https://support.reddithelp.com/hc/en-us/articles/16160319875092" target="_blank" rel="noreferrer">Responsible Builder Policy</a>.
          </p>

          <h3>What Reddit data we access</h3>
          <p>When you connect a Reddit account, Posthive requests the following OAuth scopes:</p>
          <ul>
            <li><strong style={{ color: "#cfcfcf" }}>identity</strong> — to verify your Reddit username and confirm successful authentication</li>
            <li><strong style={{ color: "#cfcfcf" }}>submit</strong> — to publish text and link posts to subreddits you explicitly select</li>
          </ul>
          <p>We do not request access to your Reddit inbox, comments, votes, moderation tools, subscriptions, or any other Reddit data beyond what is listed above.</p>

          <h3>How we use Reddit data</h3>
          <p>
            Reddit user data is used <strong style={{ color: "#ededed" }}>exclusively</strong> to publish posts you have written and scheduled inside Posthive. Every post is user-initiated — you write the content, choose the subreddit, and set the publish time. Posthive never posts to Reddit automatically without your explicit instruction.
          </p>
          <ul>
            <li>We do not scrape Reddit content, posts, comments, or user data.</li>
            <li>We do not store Reddit posts, comments, votes, or any content retrieved from Reddit.</li>
            <li>We do not use your Reddit credentials to read Reddit feeds or aggregate content.</li>
            <li>We do not resell, license, or share any Reddit data with third parties.</li>
            <li>We do not use Reddit data to train, develop, or improve any AI or machine learning model.</li>
            <li>We do not perform any automated bulk posting, spam, or vote manipulation.</li>
            <li>We respect all Reddit API rate limits and terms at all times.</li>
          </ul>

          <h3>How we protect Reddit data</h3>
          <p>
            Your Reddit OAuth tokens are encrypted at rest using AES-256-GCM with a key stored only in the server environment — never in the database. Tokens are transmitted only over HTTPS and are never logged, exposed in API responses, or accessible to any third party.
          </p>

          <h3>Data retention and deletion — Reddit data</h3>
          <p>
            Your Reddit OAuth tokens are retained only while your Reddit account is connected in Posthive. Scheduled post content (title, text, subreddit) is stored until the post is published, after which it remains in your post history for your reference but is never re-used or re-posted automatically. You can disconnect your Reddit account at any time from the Accounts page — this immediately and permanently deletes your stored Reddit token. When you delete your Posthive account, all Reddit tokens and associated data are permanently deleted within 30 days.
          </p>

          <h2>12. Self-hosted instances</h2>
          <p>
            If you run Posthive on your own infrastructure, this policy does not apply to your instance. You are the data controller and are responsible for your users' data under applicable law.
          </p>

          <h2>13. Changes to this policy</h2>
          <p>
            We may update this policy as the product evolves. Material changes will be communicated via email or an in-app notice at least 14 days before they take effect. The "Last updated" date at the top will always reflect the current version.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions about this policy? Reach us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "#555" }}>
        <span>© 2026 Posthive. Open source under AGPL-3.0.</span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/privacy" style={{ color: "#9ba2ee" }}>Privacy</Link>
          <Link href="/terms" style={{ color: "#777", textDecoration: "none" }}>Terms</Link>
        </div>
      </div>
    </div>
  );
}
