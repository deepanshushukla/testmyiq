import type { ResultAccessState } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getSystemSettingValue } from "@/lib/config/system-settings";

export const REMINDER_INTERVAL_SETTING_KEY = "reminder_interval_days";
export const REMINDER_MAX_COUNT_SETTING_KEY = "reminder_max_count";
export const DEFAULT_REMINDER_INTERVAL_DAYS = 7;
export const DEFAULT_REMINDER_MAX_COUNT = 10;

export type DueReminder = {
  userId: string;
  assessmentId: string;
  reminderNumber: number;
  resultAccessState: ResultAccessState;
};

export async function getReminderIntervalDays(): Promise<number> {
  return getSystemSettingValue(REMINDER_INTERVAL_SETTING_KEY, DEFAULT_REMINDER_INTERVAL_DAYS);
}

export async function getReminderMaxCount(): Promise<number> {
  return getSystemSettingValue(REMINDER_MAX_COUNT_SETTING_KEY, DEFAULT_REMINDER_MAX_COUNT);
}

/**
 * requirement.txt §2.4: "Users who have completed their assessment but
 * haven't unlocked and viewed their results should receive a reminder
 * every seven days." Stop conditions: unlocked *and* viewed
 * (`RESULT_VIEWED` — the two are independent, so an unlocked-but-unviewed
 * result still gets reminded, just with different email copy — see
 * `lib/reminders/send.ts`), account deletion, unsubscribe, and the
 * configurable max reminder count.
 *
 * "Completed" means a genuine `SUBMITTED` assessment, never `EXPIRED` —
 * same distinction Phase 7 drew for referral qualification
 * (`lib/referrals/qualification.ts`). For a user with retakes, only the
 * most recent submitted attempt's result matters (same precedent as
 * `lib/referrals/unlock.ts`), so an older attempt never makes a user
 * eligible once a newer one exists.
 */
export async function findUsersDueForReminder(now: Date = new Date()): Promise<DueReminder[]> {
  const [intervalDays, maxCount] = await Promise.all([
    getReminderIntervalDays(),
    getReminderMaxCount(),
  ]);
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: null,
      reminderUnsubscribedAt: null,
      assessments: { some: { status: "SUBMITTED" } },
    },
    select: {
      id: true,
      assessments: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: {
          id: true,
          submittedAt: true,
          result: { select: { resultAccessState: true } },
        },
      },
      emailReminders: {
        orderBy: { reminderNumber: "desc" },
        take: 1,
        select: { reminderNumber: true, sentAt: true },
      },
    },
  });

  const due: DueReminder[] = [];

  for (const user of candidates) {
    const latestAssessment = user.assessments[0];
    if (!latestAssessment?.result || latestAssessment.result.resultAccessState === "RESULT_VIEWED") {
      continue;
    }

    const lastReminder = user.emailReminders[0];
    const nextReminderNumber = (lastReminder?.reminderNumber ?? 0) + 1;
    if (nextReminderNumber > maxCount) continue;

    const dueSince = lastReminder?.sentAt ?? latestAssessment.submittedAt;
    if (!dueSince || now.getTime() - dueSince.getTime() < intervalMs) continue;

    due.push({
      userId: user.id,
      assessmentId: latestAssessment.id,
      reminderNumber: nextReminderNumber,
      resultAccessState: latestAssessment.result.resultAccessState,
    });
  }

  return due;
}
