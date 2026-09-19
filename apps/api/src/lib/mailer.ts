import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Posthive <noreply@mail.posthive.co>";
const APP_URL = process.env.WEB_URL ?? "https://posthive.co";

const LOGO = `https://posthive.co/posthivemain.png`;

function emailShell(topbarColor: string, body: string, footerText: string): string {
  return `
<div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0a;border-radius:10px;overflow:hidden;border:1px solid #1e1e1e;">
  <div style="height:3px;background:${topbarColor};"></div>
  <div style="padding:20px 28px 18px;border-bottom:1px solid #242424;">
    <img src="${LOGO}" alt="Posthive" style="height:28px;width:auto;display:block;">
  </div>
  <div style="padding:28px 28px 24px;">
    ${body}
  </div>
  <div style="padding:16px 28px;border-top:1px solid #242424;">
    <p style="font-size:11px;color:#444;line-height:1.65;margin:0;">${footerText}</p>
  </div>
</div>
  `.trim();
}

function eyebrow(text: string, color = "#5b63d3"): string {
  return `<p style="font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${color};margin:0 0 8px;">${text}</p>`;
}

function heading(text: string): string {
  return `<h1 style="font-size:20px;font-weight:700;color:#ededed;line-height:1.3;letter-spacing:-0.02em;margin:0 0 12px;">${text}</h1>`;
}

function bodyText(text: string, extra = ""): string {
  return `<p style="font-size:13.5px;line-height:1.7;color:#7a7a7a;margin:0 0 14px;${extra}">${text}</p>`;
}

function ctaButton(href: string, label: string, bg = "#ffffff", fg = "#0a0a0a"): string {
  return `<a href="${href}" style="display:inline-block;background:${bg};color:${fg};font-size:13px;font-weight:700;padding:11px 22px;border-radius:7px;text-decoration:none;letter-spacing:-0.01em;margin-top:10px;">${label}</a>`;
}

function divider(): string {
  return `<div style="height:1px;background:#242424;margin:22px 0;"></div>`;
}

function infoBox(content: string): string {
  return `<div style="background:#141414;border:1px solid #242424;border-radius:7px;padding:14px 18px;margin-bottom:18px;">${content}</div>`;
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const body = `
    ${eyebrow("One step left")}
    ${heading("Verify your email address.")}
    ${bodyText("Thanks for signing up for Posthive. Confirm your email to activate your account and unlock your 14-day free trial.")}
    ${infoBox(`<p style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#7a7a7a;margin:0 0 5px;">Link expires in</p><p style="font-size:14px;font-weight:600;color:#ededed;margin:0;">24 hours</p>`)}
    ${ctaButton(verifyUrl, "Verify email address")}
    ${divider()}
    ${bodyText(`If the button does not work, copy this URL into your browser:<br><span style="color:#555;font-size:12px;word-break:break-all;">${verifyUrl}</span>`, "font-size:12.5px;")}
  `;
  const html = emailShell(
    "linear-gradient(90deg,#5b63d3,#7c84e8)",
    body,
    `If you did not create a Posthive account, ignore this email.<br><a href="https://posthive.co" style="color:#555;">posthive.co</a>`,
  );

  if (!resend) {
    console.log(`[mailer] Email verification link for ${to}:\n${verifyUrl}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject: "Verify your Posthive email", html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const body = `
    ${eyebrow("Security")}
    ${heading("Reset your password.")}
    ${bodyText("We received a request to reset the password on your Posthive account. Use the button below. This link is valid for <strong style=\"color:#ededed;\">1 hour</strong>.")}
    ${ctaButton(resetUrl, "Set new password")}
    ${divider()}
    ${bodyText("Did not request this? Your account is safe. Someone may have typed your email by mistake. No action is needed.", "font-size:12.5px;")}
  `;
  const html = emailShell(
    "linear-gradient(90deg,#5b63d3,#7c84e8)",
    body,
    `This link expires after 1 hour and can only be used once.<br><a href="https://posthive.co" style="color:#555;">posthive.co</a>`,
  );

  if (!resend) {
    console.log(`[mailer] Password reset link for ${to}:\n${resetUrl}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject: "Reset your Posthive password", html });
}

export async function sendAccountExpiryEmail(
  to: string,
  platform: string,
  displayName: string,
  daysLeft: number,
): Promise<void> {
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  const reconnectUrl = `${APP_URL}/accounts`;
  const plural = daysLeft === 1 ? "" : "s";

  const body = `
    <div style="display:inline-flex;align-items:center;gap:6px;background:#141414;border:1px solid #242424;border-radius:20px;padding:4px 12px 4px 8px;font-size:12px;font-weight:600;color:#ededed;margin-bottom:14px;">
      <div style="width:7px;height:7px;border-radius:50%;background:#1c93e3;"></div>
      ${platformLabel}
    </div>
    ${eyebrow("Action required", "#f59e0b")}
    ${heading(`Your ${platformLabel} connection expires soon.`)}
    <div style="display:flex;align-items:baseline;gap:7px;margin-bottom:18px;">
      <span style="font-size:48px;font-weight:800;color:#f59e0b;letter-spacing:-0.04em;line-height:1;">${daysLeft}</span>
      <span style="font-size:14px;color:#7a7a7a;">day${plural} left</span>
    </div>
    ${bodyText(`Your <strong style="color:#ededed;">${platformLabel}</strong> account <strong style="color:#ededed;">${displayName}</strong> is connected to Posthive, but its access token expires in ${daysLeft} day${plural}. ${platformLabel} does not support automatic renewal. Reconnect now to keep your scheduled posts working.`)}
    ${ctaButton(reconnectUrl, `Reconnect ${platformLabel}`, "#f59e0b", "#0a0a0a")}
    ${divider()}
    ${bodyText(`Go to <strong style="color:#ededed;">Accounts</strong> in Posthive, disconnect ${platformLabel}, then reconnect to generate a fresh token.`, "font-size:12.5px;")}
  `;
  const html = emailShell(
    "#f59e0b",
    body,
    `Posts scheduled past the expiry date will fail if the account is not reconnected.<br><a href="https://posthive.co" style="color:#555;">posthive.co</a>`,
  );

  if (!resend) {
    console.log(`[mailer] Account expiry warning for ${to}: ${platformLabel} (${displayName}) expires in ${daysLeft}d`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Action needed: reconnect your ${platformLabel} account before it expires`,
    html,
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const body = `
    ${eyebrow("You are in")}
    ${heading(`Welcome, ${name}. Your 14-day trial starts now.`)}
    ${bodyText("Schedule posts to <strong style=\"color:#ededed;\">14 platforms</strong> from one place. Connect your first social account to get started.")}
    ${bodyText("Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, X, Discord and more are all waiting. Your trial includes everything, no credit card required.")}
    ${ctaButton(`${APP_URL}/accounts`, "Connect your first account")}
    ${divider()}
    ${bodyText("Questions? Reply to this email. We read every one.", "font-size:12.5px;")}
  `;
  const html = emailShell(
    "linear-gradient(90deg,#5b63d3,#7c84e8)",
    body,
    `You received this because you created a Posthive account.<br><a href="https://posthive.co" style="color:#555;">posthive.co</a>`,
  );

  if (!resend) {
    console.log(`[mailer] Welcome email for ${to}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject: "Welcome to Posthive", html });
}

export async function sendCleanupSummaryEmail(
  to: string,
  stats: { sessions: number; events: number; postJobs: number; oauthStates: number; emailVerifications: number },
): Promise<void> {
  const now = new Date().toUTCString();
  const rows = [
    ["Sessions deleted", stats.sessions],
    ["Events deleted", stats.events],
    ["PostJobs deleted", stats.postJobs],
    ["OAuth states cleared", stats.oauthStates],
    ["Email verifications cleared", stats.emailVerifications],
  ] as [string, number][];

  const tableRows = rows
    .map(
      ([label, count]) =>
        `<tr style="border-bottom:1px solid #242424;">
          <td style="padding:9px 0;color:#7a7a7a;font-size:13px;">${label}</td>
          <td style="padding:9px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;font-size:13px;color:${count === 0 ? "#555" : "#ededed"};">${count.toLocaleString()}</td>
        </tr>`,
    )
    .join("");

  const body = `
    <div style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.2);margin-bottom:18px;">
      <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></div>
      Completed
    </div>
    ${eyebrow("Daily cleanup", "#22c55e")}
    ${heading("DB cleanup ran successfully.")}
    ${bodyText(now, "margin-bottom:18px;")}
    ${infoBox(`<table style="width:100%;border-collapse:collapse;">${tableRows.replace(/border-bottom:1px solid #242424;/g, "border-bottom:1px solid #242424;")}</table>`)}
    ${bodyText("PostJobs will appear once the app is older than 90 days. Next cleanup runs at 03:00 UTC tomorrow.", "font-size:12.5px;")}
  `;
  const html = emailShell(
    "#22c55e",
    body,
    `Internal notification sent to ${to} only.<br><a href="https://posthive.co" style="color:#555;">posthive.co</a>`,
  );

  if (!resend) {
    console.log(`[mailer] Cleanup summary: ${JSON.stringify(stats)}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject: "Posthive DB cleanup ran", html });
}

export async function sendWorkspaceInviteEmail(
  to: string,
  inviterName: string,
  workspaceName: string,
  role: string,
  acceptUrl: string,
): Promise<void> {
  const initial = inviterName.charAt(0).toUpperCase();
  const body = `
    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#5b63d3,#8c94f0);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;margin-bottom:14px;">${initial}</div>
    ${eyebrow("Team invite")}
    ${heading(`${inviterName} invited you to join <span style="color:#8c94f0;">${workspaceName}</span> on Posthive.`)}
    ${bodyText(`You have been added as <strong style="color:#ededed;">${role}</strong> to the <strong style="color:#ededed;">${workspaceName}</strong> workspace. Accept to collaborate on scheduled posts and manage connected social accounts together.`)}
    ${infoBox(`
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:0;">
            <p style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#7a7a7a;margin:0 0 5px;">Workspace</p>
            <p style="font-size:14px;font-weight:600;color:#ededed;margin:0;">${workspaceName}</p>
          </td>
          <td style="padding:0;text-align:right;">
            <p style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#7a7a7a;margin:0 0 5px;">Your role</p>
            <p style="font-size:14px;font-weight:600;color:#ededed;margin:0;">${role}</p>
          </td>
        </tr>
      </table>
    `)}
    ${ctaButton(acceptUrl, "Accept invite", "#5b63d3", "#ffffff")}
    ${divider()}
    ${bodyText(`This invite expires in <strong style="color:#ededed;">7 days</strong>. If you do not have a Posthive account yet, you will be prompted to create one first.`, "font-size:12.5px;")}
  `;
  const html = emailShell(
    "linear-gradient(90deg,#5b63d3,#7c84e8)",
    body,
    `If you were not expecting this invite, ignore this email.<br><a href="https://posthive.co" style="color:#555;">posthive.co</a>`,
  );

  if (!resend) {
    console.log(`[mailer] Workspace invite for ${to} to join "${workspaceName}":\n${acceptUrl}`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${inviterName} invited you to ${workspaceName} on Posthive`,
    html,
  });
}
