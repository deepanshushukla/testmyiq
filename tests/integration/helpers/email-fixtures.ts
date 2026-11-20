import type { EmailMessage, EmailProvider } from "@/lib/email";

export class SpyEmailProvider implements EmailProvider {
  sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

export class FailingEmailProvider implements EmailProvider {
  async send(): Promise<void> {
    throw new Error("simulated email provider failure");
  }
}
