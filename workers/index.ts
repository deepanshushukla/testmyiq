import { startReminderWorker } from "./reminder.worker";
import { startLeaderboardWorker } from "./leaderboard.worker";
import { scheduleLeaderboardRecompute } from "@/lib/jobs/leaderboard-queue";

/**
 * Separate deploy target from the Next.js app (docs/ARCHITECTURE.md §5) —
 * run via `npm run worker`. Final worker hosting is an open Phase 14
 * decision (CLAUDE.md); this process just needs to stay running wherever
 * that ends up being. Wrapped in an async IIFE rather than a top-level
 * await — tsx transforms this entrypoint as CJS, which doesn't support
 * top-level await.
 */
async function main() {
  const reminderWorker = startReminderWorker();
  const leaderboardWorker = startLeaderboardWorker();

  reminderWorker.on("completed", (job) => {
    console.log(`[worker:reminders] completed job ${job.id}`);
  });
  reminderWorker.on("failed", (job, error) => {
    console.error(`[worker:reminders] job ${job?.id} failed`, error);
  });

  leaderboardWorker.on("completed", (job) => {
    console.log(`[worker:leaderboard] completed job ${job.id}`);
  });
  leaderboardWorker.on("failed", (job, error) => {
    console.error(`[worker:leaderboard] job ${job?.id} failed`, error);
  });

  await scheduleLeaderboardRecompute();

  console.log("[worker] reminder + leaderboard workers started");

  process.on("SIGTERM", async () => {
    await Promise.all([reminderWorker.close(), leaderboardWorker.close()]);
    process.exit(0);
  });
}

main();
