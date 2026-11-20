import type { EmailMessage, EmailProvider } from "./provider";

/** Fallback used whenever SMTP credentials aren't configured, so local dev
 * works without real email credentials. */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `[email:console] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}`,
    );
  }
}
