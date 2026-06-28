import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Dev fallback — logs to console instead of sending
    return null;
  }

  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transport = createTransport();
  const from = process.env.SMTP_FROM ?? "Posthive <noreply@posthive.app>";

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

  if (!transport) {
    // No SMTP configured — print to console for dev
    console.log(`[mailer] Password reset link for ${to}:\n${resetUrl}`);
    return;
  }

  await transport.sendMail({ from, to, subject: "Reset your Posthive password", html });
}
