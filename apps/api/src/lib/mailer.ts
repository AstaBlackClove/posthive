import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Posthive <noreply@posthive.app>";

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
