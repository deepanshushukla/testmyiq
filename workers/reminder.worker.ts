import { Worker, type Job } from "bullmq";
import { getJobsRedisConnection } from "@/lib/jobs/connection";
import { REMINDERS_QUEUE_NAME } from "@/lib/jobs/reminders-queue";
import { sendReminderForUser } from "@/lib/reminders/send";
import type { DueReminder } from "@/lib/reminders/eligibility";

/**
 * The actual per-job logic is `sendReminderForUser` (plain async
 * function, independently unit/integration-testable without a live
 * BullMQ worker loop) — this file is just the long-running process
 * wiring, started via `npm run worker` (separate from the Next.js app;
 * see docs/ARCHITECTURE.md §5). A thrown error fails the job, and BullMQ
 * will retry it according to the queue's default retry policy.
 */
export function startReminderWorker(): Worker<DueReminder> {
  return new Worker<DueReminder>(
    REMINDERS_QUEUE_NAME,
    async (job: Job<DueReminder>) => {
      await sendReminderForUser(job.data);
    },
    { connection: getJobsRedisConnection() },
  );
}
