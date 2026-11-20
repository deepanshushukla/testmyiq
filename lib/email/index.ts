import { ConsoleEmailProvider } from "./console-provider";
import { GmailSmtpEmailProvider } from "./gmail-smtp-provider";
import type { EmailProvider } from "./provider";

export type { EmailMessage, EmailProvider } from "./provider";

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;

  const hasSmtpCredentials = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  cachedProvider = hasSmtpCredentials
    ? new GmailSmtpEmailProvider(process.env.SMTP_FROM || process.env.SMTP_USER!)
    : new ConsoleEmailProvider();

  return cachedProvider;
}
