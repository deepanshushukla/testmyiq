import { Worker } from "bullmq";
import { getJobsRedisConnection } from "@/lib/jobs/connection";
import { LEADERBOARD_QUEUE_NAME } from "@/lib/jobs/leaderboard-queue";
import { recomputeLeaderboards } from "@/lib/gamification/leaderboard";

/** Processes the recurring recompute job scheduled by
 * `scheduleLeaderboardRecompute` — see `lib/gamification/leaderboard.ts`
 * for the actual computation, independently testable without BullMQ. */
export function startLeaderboardWorker(): Worker {
  return new Worker(
    LEADERBOARD_QUEUE_NAME,
    async () => {
      await recomputeLeaderboards();
    },
    { connection: getJobsRedisConnection() },
  );
}
