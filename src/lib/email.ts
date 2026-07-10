/**
 * Transactional email sender.
 *
 * Uses Resend when RESEND_API_KEY is set. Falls back to a console log in dev
 * so the flow can be exercised end-to-end without a provider — the reset URL
 * is printed to the server log and the caller can copy it into a browser.
 */

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const FROM =
  process.env.EMAIL_FROM ??
  'RepetoIQ <onboarding@resend.dev>';

export async function sendEmail(args: SendArgs): Promise<{ delivered: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log('[email] RESEND_API_KEY not set — would have sent:');
    console.log(`  to:      ${args.to}`);
    console.log(`  subject: ${args.subject}`);
    console.log(`  body:\n${args.text}`);
    return { delivered: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Don't leak the provider error to the caller — but do log it server-side
    // so gym owners investigating a delivery issue can find it.
    console.error(`[email] Resend rejected send (${res.status}): ${body}`);
    return { delivered: false };
  }
  return { delivered: true };
}

export function buildResetEmail(input: {
  memberName: string;
  gymName: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Reset your ${input.gymName} passcode`;
  const text = [
    `Hi ${input.memberName},`,
    ``,
    `Someone (hopefully you) asked to reset your RepetoIQ passcode at ${input.gymName}.`,
    ``,
    `Open this link on your phone to pick a new 4-digit passcode:`,
    input.resetUrl,
    ``,
    `The link expires in 30 minutes. If you didn't request this, you can ignore this email — your existing passcode still works.`,
    ``,
    `— RepetoIQ`,
  ].join('\n');
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
      <p style="font-size: 14px; color: #555; margin: 0 0 24px 0; letter-spacing: 0.2em; text-transform: uppercase;">RepetoIQ</p>
      <h1 style="font-size: 22px; margin: 0 0 12px 0;">Reset your passcode</h1>
      <p style="font-size: 15px; line-height: 1.5;">Hi ${escapeHtml(input.memberName)}, someone asked to reset your passcode at <strong>${escapeHtml(input.gymName)}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${input.resetUrl}" style="display: inline-block; background: #eab308; color: #111; padding: 14px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Pick a new passcode</a>
      </p>
      <p style="font-size: 13px; color: #666; line-height: 1.5;">This link expires in 30 minutes. If you didn't request this, ignore this email — your existing passcode still works.</p>
    </div>
  `;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
