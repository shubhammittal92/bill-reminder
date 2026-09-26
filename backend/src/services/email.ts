/**
 * Email delivery.
 *
 * Two backends are supported, tried in order:
 *   1. Gmail SMTP  — set GMAIL_USER and GMAIL_APP_PASSWORD (a Google
 *      "App Password", NOT your normal password). REMINDER_TO is the recipient
 *      (defaults to GMAIL_USER, i.e. send to yourself).
 *   2. AWS SES     — set SES_FROM and REMINDER_TO (and AWS_REGION).
 *
 * If neither is configured, the digest is logged to the console instead of
 * sent — so the app runs out of the box for anyone who clones it.
 *
 * Secrets are read from the environment (a local, git-ignored .env), never
 * hard-coded.
 */

import { Digest } from './digest';

export interface EmailResult {
  sent: boolean;
  via?: 'gmail' | 'ses';
  reason?: string;
}

export async function sendDigestEmail(digest: Digest, recipient?: string): Promise<EmailResult> {
  if (digest.count === 0) {
    return { sent: false, reason: 'nothing due' };
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return sendViaGmail(digest, gmailUser, gmailPass, recipient);
  }

  const sesFrom = process.env.SES_FROM;
  const sesTo = recipient || process.env.REMINDER_TO;
  if (sesFrom && sesTo) {
    return sendViaSes(digest, sesFrom, sesTo);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[email:fallback] no email backend configured — would have sent to ` +
      `${recipient || '(default recipient)'}:\n` +
      `Subject: ${digest.subject}\n${digest.text}`
  );
  return { sent: false, reason: 'email not configured (logged instead)' };
}

async function sendViaGmail(
  digest: Digest,
  user: string,
  pass: string,
  recipient?: string
): Promise<EmailResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer');
    const to = recipient || process.env.REMINDER_TO || user;
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    await transport.sendMail({
      from: `Bill Reminder <${user}>`,
      to,
      subject: digest.subject,
      text: digest.text,
    });
    // eslint-disable-next-line no-console
    console.log(`[email] digest sent via Gmail to ${to} (${digest.count} renewal(s))`);
    return { sent: true, via: 'gmail' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] Gmail send failed:', (err as Error).message);
    return { sent: false, via: 'gmail', reason: (err as Error).message };
  }
}

async function sendViaSes(digest: Digest, from: string, to: string): Promise<EmailResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ses = require('@aws-sdk/client-ses');
    const client = new ses.SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
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
    console.log(`[email] digest sent via SES to ${to} (${digest.count} renewal(s))`);
    return { sent: true, via: 'ses' };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] SES send failed:', (err as Error).message);
    return { sent: false, via: 'ses', reason: (err as Error).message };
  }
}
