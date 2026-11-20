import { Queue } from "bullmq";
import { getJobsRedisConnection } from "./connection";

export const LEADERBOARD_QUEUE_NAME = "leaderboard";
const RECOMPUTE_INTERVAL_MS = 5 * 60 * 1000; // docs/ARCHITECTURE.md §5: "Recurring (every 5 min)"

let queue: Queue | null = null;

export function getLeaderboardQueue(): Queue {
  if (!queue) {
    queue = new Queue(LEADERBOARD_QUEUE_NAME, { connection: getJobsRedisConnection() });
  }
  return queue;
}

/**
 * Self-scheduling, unlike the reminders queue — nothing external needs to
 * trigger this (no per-user eligibility to compute), so BullMQ's own
 * Job Scheduler support is a better fit than an HTTP cron route.
 * `upsertJobScheduler` with a stable scheduler id is idempotent — calling
 * this again on worker restart updates the existing schedule rather than
 * registering a second one.
 */
export async function scheduleLeaderboardRecompute(): Promise<void> {
  await getLeaderboardQueue().upsertJobScheduler(
    "recompute-leaderboard-recurring",
    { every: RECOMPUTE_INTERVAL_MS },
    { name: "recompute" },
  );
}
