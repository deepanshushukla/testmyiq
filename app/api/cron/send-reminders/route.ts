import { NextResponse, type NextRequest } from "next/server";
import { findUsersDueForReminder } from "@/lib/reminders/eligibility";
import { enqueueReminderJobs } from "@/lib/jobs/reminders-queue";

/**
 * Triggered by an external scheduler (cron, Vercel Cron, etc. — the
 * concrete choice is a Phase 14 hosting decision, CLAUDE.md), not by a
 * user. Auth is a shared-secret bearer token (`CRON_SECRET`) rather than a
 * user session, since there is no user on the other end of this request.
 * Finds everyone due for a reminder right now and enqueues one BullMQ job
 * per user (`lib/jobs/reminders-queue.ts`) — the actual send happens in
 * `workers/reminder.worker.ts`, not inline in this request, since Vercel
 * functions have a hard execution timeout and a sweep could cover many
 * users (docs/ARCHITECTURE.md §5).
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const due = await findUsersDueForReminder();
  const enqueued = await enqueueReminderJobs(due);

  return NextResponse.json({ enqueued });
}
