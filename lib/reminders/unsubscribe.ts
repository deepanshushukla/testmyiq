import { prisma } from "@/lib/db/client";
import { verifyUnsubscribeToken } from "./unsubscribe-token";
import { ReminderError } from "./errors";

/** Idempotent via the `reminderUnsubscribedAt: null` guard — a second
 * click on the same link (or a redelivered request) just matches zero
 * rows rather than erroring. */
export async function unsubscribeFromReminders(userId: string, token: string): Promise<void> {
  if (!verifyUnsubscribeToken(userId, token)) {
    throw new ReminderError("invalid_token", "This unsubscribe link is invalid.");
  }

  await prisma.user.updateMany({
    where: { id: userId, reminderUnsubscribedAt: null },
    data: { reminderUnsubscribedAt: new Date() },
  });
}
