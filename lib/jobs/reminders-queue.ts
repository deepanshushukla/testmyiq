import { Queue } from "bullmq";
import { getJobsRedisConnection } from "./connection";
import type { DueReminder } from "@/lib/reminders/eligibility";

export const REMINDERS_QUEUE_NAME = "reminders";

let queue: Queue<DueReminder> | null = null;

export function getRemindersQueue(): Queue<DueReminder> {
  if (!queue) {
    queue = new Queue<DueReminder>(REMINDERS_QUEUE_NAME, { connection: getJobsRedisConnection() });
  }
  return queue;
}

/**
 * One job per eligible user, named by `(userId, reminderNumber)` — BullMQ
 * treats a duplicate `jobId` added while the original is still
 * queued/active as a no-op, which is a second, cheap idempotency layer on
 * top of the real one (`email_reminders`' unique constraint, enforced in
 * `lib/reminders/send.ts`) in case `findUsersDueForReminder` is swept
 * twice before the first sweep's jobs finish.
 */
export async function enqueueReminderJobs(due: DueReminder[]): Promise<number> {
  const jobs = due.map((item) => ({
    name: "send-reminder",
    data: item,
    opts: { jobId: `${item.userId}-${item.reminderNumber}` },
  }));
  if (jobs.length === 0) return 0;

  await getRemindersQueue().addBulk(jobs);
  return jobs.length;
}
