import { Prisma, type ResultAccessState } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getEmailProvider, type EmailProvider } from "@/lib/email";
import { buildLockedReminderEmail, buildUnlockedReminderEmail } from "@/lib/email/templates";
import { buildUnsubscribeUrl } from "./unsubscribe-token";
import type { DueReminder } from "./eligibility";

const LOCKED_FAMILY: ResultAccessState[] = ["LOCKED", "REFERRAL_PENDING", "PAYMENT_PENDING"];

/**
 * Called by the reminder worker (`workers/reminder.worker.ts`) for each
 * job `findUsersDueForReminder` enqueued. Re-checks stop conditions and
 * current result state against live data rather than trusting the
 * snapshot taken at enqueue time — a user can delete their account,
 * unsubscribe, or view their result in the gap between enqueue and
 * processing.
 *
 * Idempotent the same way `lib/payments/create-intent.ts` is: the
 * `email_reminders` row is created *first*, as a reservation, before any
 * send is attempted — `(userId, reminderNumber)` is unique, so a
 * duplicate/retried job for the same slot is a clean no-op (P2002) rather
 * than a second email.
 */
export async function sendReminderForUser(
  due: DueReminder,
  emailProvider: EmailProvider = getEmailProvider(),
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: due.userId } });
  if (!user || user.deletedAt || user.reminderUnsubscribedAt) return;

  const result = await prisma.assessmentResult.findUnique({
    where: { assessmentId: due.assessmentId },
  });
  if (!result || result.resultAccessState === "RESULT_VIEWED") return;

  let reminder;
  try {
    reminder = await prisma.emailReminder.create({
      data: {
        userId: due.userId,
        assessmentId: due.assessmentId,
        reminderNumber: due.reminderNumber,
        deliveryStatus: "pending",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return; // this slot was already claimed by a concurrent/duplicate job
    }
    throw error;
  }

  const appName = process.env.APP_NAME ?? "Cognitive Assessment Platform";
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const resultsUrl = `${baseUrl}/results/${due.assessmentId}`;
  const unsubscribeUrl = buildUnsubscribeUrl(due.userId, baseUrl);

  const message = LOCKED_FAMILY.includes(result.resultAccessState)
    ? buildLockedReminderEmail({ resultsUrl, unsubscribeUrl, appName })
    : buildUnlockedReminderEmail({ resultsUrl, unsubscribeUrl, appName });

  try {
    await emailProvider.send({ to: user.email, ...message });
    await prisma.emailReminder.update({
      where: { id: reminder.id },
      data: { deliveryStatus: "sent" },
    });
  } catch (error) {
    await prisma.emailReminder.update({
      where: { id: reminder.id },
      data: { deliveryStatus: "failed" },
    });
    throw error;
  }
}
