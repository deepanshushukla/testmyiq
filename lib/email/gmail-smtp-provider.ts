import nodemailer, { type Transporter } from "nodemailer";
import type { EmailMessage, EmailProvider } from "./provider";

/** Gmail SMTP, free tier (~500/day) — docs/PRD.md assumption #3, revisit
 * weekly. Business logic must only ever depend on the EmailProvider
 * interface, never on this implementation directly. */
export class GmailSmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(fromAddress: string) {
    this.fromAddress = fromAddress;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
