/**
 * Email delivery via AWS SES.
 *
 * Configuration is read from environment variables:
 *   - SES_FROM     verified SES sender address (required to actually send)
 *   - REMINDER_TO  recipient address (required to actually send)
 *   - AWS_REGION   SES region (default: us-east-1)
 *
 * If the required config is missing, this falls back to logging the email to
 * the console instead of throwing — so the app runs out of the box for anyone
 * who clones it, and only sends real email once configured.
 */

import { Digest } from './digest';

// Lazy import so the app does not hard-require the AWS SDK to boot / run tests.
type SESModule = typeof import('@aws-sdk/client-ses');

export interface EmailResult {
  sent: boolean;
  reason?: string;
}

export async function sendDigestEmail(digest: Digest): Promise<EmailResult> {
  const from = process.env.SES_FROM;
  const to = process.env.REMINDER_TO;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (digest.count === 0) {
    return { sent: false, reason: 'nothing due' };
  }

  if (!from || !to) {
    // eslint-disable-next-line no-console
    console.log(
      `[email:fallback] SES_FROM/REMINDER_TO not set — would have emailed:\n` +
        `Subject: ${digest.subject}\n${digest.text}`
    );
    return { sent: false, reason: 'email not configured (logged instead)' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ses: SESModule = require('@aws-sdk/client-ses');
    const client = new ses.SESClient({ region });
    await client.send(
      new ses.SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: digest.subject },
          Body: { Text: { Data: digest.text } },
        },
      })
    );
    // eslint-disable-next-line no-console
    console.log(`[email] digest sent to ${to} (${digest.count} renewal(s))`);
    return { sent: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] failed to send via SES:', (err as Error).message);
    return { sent: false, reason: (err as Error).message };
  }
}
