import "server-only";

import { Resend } from "resend";

export interface SendResult {
  ok: boolean;
  dryRun: boolean;
  error?: string;
}

/**
 * True only when a real Resend key AND a sending address are configured. Until
 * the Resend Marketplace resource is provisioned and a domain is verified,
 * NOTIFICATIONS_FROM is unset and we run in dry-run — the dispatch computes and
 * logs intended sends without calling Resend. This is a safety no-op of the
 * REAL integration, not a mock provider.
 */
function isConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATIONS_FROM;
  const keyOk = !!key && !/your-resend|placeholder/i.test(key);
  return keyOk && !!from;
}

export function emailConfigured(): boolean {
  return isConfigured();
}

/**
 * Send one transactional email via Resend, or return a dry-run result when
 * email isn't provisioned yet. Never throws — returns a SendResult the caller
 * records in notifications_log.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  if (!isConfigured()) return { ok: true, dryRun: true };

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.NOTIFICATIONS_FROM!,
      to: params.to,
      subject: params.subject,
      text: params.body,
    });
    if (error) return { ok: false, dryRun: false, error: error.message };
    return { ok: true, dryRun: false };
  } catch (e) {
    return { ok: false, dryRun: false, error: e instanceof Error ? e.message : String(e) };
  }
}
