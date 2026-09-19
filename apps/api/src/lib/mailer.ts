import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Posthive <noreply@mail.posthive.co>";

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#ededed;">
      <h2 style="margin:0 0 8px;font-size:20px;">Verify your email</h2>
      <p style="color:#888;margin:0 0 24px;font-size:14px;">
        Thanks for signing up for Posthive. Click the button below to verify your email address — this link expires in 24 hours.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
        Verify email →
      </a>
      <p style="color:#555;font-size:12px;margin:24px 0 0;">
        If you didn't create a Posthive account, you can safely ignore this email.
      </p>
    </div>
  `;

  if (!resend) {
    console.log(`[mailer] Email verification link for ${to}:\n${verifyUrl}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject: "Verify your Posthive email", html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#ededed;">
      <h2 style="margin:0 0 8px;font-size:20px;">Reset your password</h2>
      <p style="color:#888;margin:0 0 24px;font-size:14px;">
        We received a request to reset the password for your Posthive account.
        Click the button below — this link expires in 1 hour.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
        Reset password →
      </a>
      <p style="color:#555;font-size:12px;margin:24px 0 0;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  if (!resend) {
    // No Resend API key — print to console for dev
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
  const reconnectUrl = `${process.env.WEB_URL ?? "https://app.posthive.co"}/accounts`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#ededed;">
      <h2 style="margin:0 0 8px;font-size:20px;">Your ${platformLabel} connection expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}</h2>
      <p style="color:#888;margin:0 0 8px;font-size:14px;">
        Your <strong style="color:#ededed;">${platformLabel}</strong> account <strong style="color:#ededed;">${displayName}</strong>
        is connected to Posthive, but its access token expires in <strong style="color:#ededed;">${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>.
      </p>
      <p style="color:#888;margin:0 0 24px;font-size:14px;">
        ${platformLabel} doesn't support automatic token renewal — you'll need to reconnect it manually before it expires to keep your scheduled posts working.
      </p>
      <a href="${reconnectUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
        Reconnect ${platformLabel} →
      </a>
      <p style="color:#555;font-size:12px;margin:24px 0 0;">
        Go to Accounts in Posthive, disconnect ${platformLabel}, and reconnect to generate a fresh token.
      </p>
    </div>
  `;

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
  const appUrl = process.env.WEB_URL ?? "https://app.posthive.co";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#ededed;">
      <h2 style="margin:0 0 8px;font-size:20px;">Welcome to Posthive, ${name}!</h2>
      <p style="color:#888;margin:0 0 24px;font-size:14px;">
        You're on a 14-day free trial. Connect your social accounts and start scheduling posts across every platform from one place.
      </p>
      <a href="${appUrl}/accounts" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
        Connect your first account →
      </a>
      <p style="color:#555;font-size:12px;margin:24px 0 0;">
        Reply to this email if you need any help getting started.
      </p>
    </div>
  `;

  if (!resend) {
    console.log(`[mailer] Welcome email for ${to}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject: "Welcome to Posthive 🎉", html });
}

export async function sendCleanupSummaryEmail(
  to: string,
  stats: { sessions: number; events: number; postJobs: number; oauthStates: number; emailVerifications: number }
): Promise<void> {
  const now = new Date().toUTCString();
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#ededed;">
      <h2 style="margin:0 0 8px;font-size:20px;">DB Cleanup ran successfully</h2>
      <p style="color:#888;margin:0 0 16px;font-size:14px;">${now}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="border-bottom:1px solid #2a2a2a;"><td style="padding:8px 0;color:#888;">Sessions</td><td style="padding:8px 0;text-align:right;color:#ededed;">${stats.sessions} deleted</td></tr>
        <tr style="border-bottom:1px solid #2a2a2a;"><td style="padding:8px 0;color:#888;">Events</td><td style="padding:8px 0;text-align:right;color:#ededed;">${stats.events} deleted</td></tr>
        <tr style="border-bottom:1px solid #2a2a2a;"><td style="padding:8px 0;color:#888;">PostJobs</td><td style="padding:8px 0;text-align:right;color:#ededed;">${stats.postJobs} deleted</td></tr>
        <tr style="border-bottom:1px solid #2a2a2a;"><td style="padding:8px 0;color:#888;">OAuthStates</td><td style="padding:8px 0;text-align:right;color:#ededed;">${stats.oauthStates} deleted</td></tr>
        <tr><td style="padding:8px 0;color:#888;">EmailVerifications</td><td style="padding:8px 0;text-align:right;color:#ededed;">${stats.emailVerifications} deleted</td></tr>
      </table>
    </div>
  `;

  if (!resend) {
    console.log(`[mailer] Cleanup summary: ${JSON.stringify(stats)}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject: "Posthive DB cleanup ran ✓", html });
}

export async function sendWorkspaceInviteEmail(
  to: string,
  inviterName: string,
  workspaceName: string,
  role: string,
  acceptUrl: string,
): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#ededed;">
      <h2 style="margin:0 0 8px;font-size:20px;">You've been invited to join ${workspaceName}</h2>
      <p style="color:#888;margin:0 0 24px;font-size:14px;">
        ${inviterName} has invited you to join <strong style="color:#ededed;">${workspaceName}</strong> on Posthive as a <strong style="color:#ededed;">${role}</strong>.
        Click the button below to accept — this invite expires in 7 days.
      </p>
      <a href="${acceptUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
        Accept invite →
      </a>
      <p style="color:#555;font-size:12px;margin:24px 0 0;">
        If you don't have a Posthive account yet, you'll be asked to create one first.
      </p>
    </div>
  `;

  if (!resend) {
    console.log(`[mailer] Workspace invite for ${to} to join "${workspaceName}":\n${acceptUrl}`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject: `${inviterName} invited you to ${workspaceName} on Posthive`, html });
}
