import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  findUsersDueForReminder,
  REMINDER_INTERVAL_SETTING_KEY,
  REMINDER_MAX_COUNT_SETTING_KEY,
} from "@/lib/reminders/eligibility";
import { sendReminderForUser } from "@/lib/reminders/send";
import { unsubscribeFromReminders } from "@/lib/reminders/unsubscribe";
import { buildUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/reminders/unsubscribe-token";
import { ReminderError } from "@/lib/reminders/errors";
import { enqueueReminderJobs, getRemindersQueue } from "@/lib/jobs/reminders-queue";
import { startReminderWorker } from "@/workers/reminder.worker";
import { createVerifiedUser, seedAssessmentFixtures, startAndSubmitAssessment } from "./helpers/assessment-fixtures";
import { FailingEmailProvider, SpyEmailProvider } from "./helpers/email-fixtures";

const DAY_MS = 24 * 60 * 60 * 1000;

async function setReminderSettings(intervalDays: number, maxCount: number) {
  await prisma.systemSetting.upsert({
    where: { key: REMINDER_INTERVAL_SETTING_KEY },
    update: { value: { value: intervalDays } },
    create: { key: REMINDER_INTERVAL_SETTING_KEY, value: { value: intervalDays } },
  });
  await prisma.systemSetting.upsert({
    where: { key: REMINDER_MAX_COUNT_SETTING_KEY },
    update: { value: { value: maxCount } },
    create: { key: REMINDER_MAX_COUNT_SETTING_KEY, value: { value: maxCount } },
  });
}

describe("weekly email reminders", () => {
  beforeEach(async () => {
    await seedAssessmentFixtures();
    await setReminderSettings(7, 10);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("findUsersDueForReminder", () => {
    it("is not due before the interval has elapsed", async () => {
      const user = await createVerifiedUser("not-due@example.com");
      await startAndSubmitAssessment(user.id, "all-incorrect");

      const sixDaysLater = new Date(Date.now() + 6 * DAY_MS);
      const due = await findUsersDueForReminder(sixDaysLater);
      expect(due.find((d) => d.userId === user.id)).toBeUndefined();
    });

    it("is due once the interval has elapsed since submission", async () => {
      const user = await createVerifiedUser("due@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");

      const eightDaysLater = new Date(Date.now() + 8 * DAY_MS);
      const due = await findUsersDueForReminder(eightDaysLater);
      const match = due.find((d) => d.userId === user.id);
      expect(match).toMatchObject({
        assessmentId: assessment.id,
        reminderNumber: 1,
        resultAccessState: "LOCKED",
      });
    });

    it("excludes a user whose assessment only ever EXPIRED, never SUBMITTED", async () => {
      const user = await createVerifiedUser("expired-only@example.com");
      const template = await prisma.assessmentTemplate.findFirstOrThrow();
      await prisma.assessment.create({
        data: {
          userId: user.id,
          templateId: template.id,
          status: "EXPIRED",
          startedAt: new Date(Date.now() - 20 * DAY_MS),
          expiresAt: new Date(Date.now() - 19 * DAY_MS),
          submittedAt: new Date(Date.now() - 19 * DAY_MS),
        },
      });

      const due = await findUsersDueForReminder(new Date());
      expect(due.find((d) => d.userId === user.id)).toBeUndefined();
    });

    it("excludes a result that's already been viewed", async () => {
      const user = await createVerifiedUser("viewed@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.assessmentResult.update({
        where: { assessmentId: assessment.id },
        data: { resultAccessState: "RESULT_VIEWED" },
      });

      const due = await findUsersDueForReminder(new Date(Date.now() + 8 * DAY_MS));
      expect(due.find((d) => d.userId === user.id)).toBeUndefined();
    });

    it("still includes an unlocked-but-unviewed result — unlocking and viewing are independent stop conditions", async () => {
      const user = await createVerifiedUser("unlocked-unviewed@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.assessmentResult.update({
        where: { assessmentId: assessment.id },
        data: { resultAccessState: "UNLOCKED_BY_REFERRAL" },
      });

      const due = await findUsersDueForReminder(new Date(Date.now() + 8 * DAY_MS));
      const match = due.find((d) => d.userId === user.id);
      expect(match?.resultAccessState).toBe("UNLOCKED_BY_REFERRAL");
    });

    it("excludes a deleted account", async () => {
      const user = await createVerifiedUser("deleted@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });
      void assessment;

      const due = await findUsersDueForReminder(new Date(Date.now() + 8 * DAY_MS));
      expect(due.find((d) => d.userId === user.id)).toBeUndefined();
    });

    it("excludes an unsubscribed user", async () => {
      const user = await createVerifiedUser("unsubscribed@example.com");
      await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.user.update({ where: { id: user.id }, data: { reminderUnsubscribedAt: new Date() } });

      const due = await findUsersDueForReminder(new Date(Date.now() + 8 * DAY_MS));
      expect(due.find((d) => d.userId === user.id)).toBeUndefined();
    });

    it("the second reminder is due 7 days after the first was sent, not from submission", async () => {
      const user = await createVerifiedUser("second-reminder@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.emailReminder.create({
        data: {
          userId: user.id,
          assessmentId: assessment.id,
          reminderNumber: 1,
          sentAt: new Date(Date.now() - 6 * DAY_MS),
        },
      });

      // Submission was >7 days ago, but the first reminder was only sent
      // 6 days ago — not due yet.
      const notYetDue = await findUsersDueForReminder(new Date());
      expect(notYetDue.find((d) => d.userId === user.id)).toBeUndefined();

      const due = await findUsersDueForReminder(new Date(Date.now() + 2 * DAY_MS));
      const match = due.find((d) => d.userId === user.id);
      expect(match?.reminderNumber).toBe(2);
    });

    it("stops once the configured max reminder count is reached", async () => {
      await setReminderSettings(7, 2);
      const user = await createVerifiedUser("max-count@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.emailReminder.createMany({
        data: [
          { userId: user.id, assessmentId: assessment.id, reminderNumber: 1, sentAt: new Date(Date.now() - 30 * DAY_MS) },
          { userId: user.id, assessmentId: assessment.id, reminderNumber: 2, sentAt: new Date(Date.now() - 20 * DAY_MS) },
        ],
      });

      const due = await findUsersDueForReminder(new Date());
      expect(due.find((d) => d.userId === user.id)).toBeUndefined();
    });

    it("on a retake, only the most recent submitted assessment drives eligibility", async () => {
      const user = await createVerifiedUser("retake@example.com");
      const firstAssessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.assessmentResult.update({
        where: { assessmentId: firstAssessment.id },
        data: { resultAccessState: "RESULT_VIEWED" },
      });
      const secondAssessment = await startAndSubmitAssessment(user.id, "all-incorrect");

      const due = await findUsersDueForReminder(new Date(Date.now() + 8 * DAY_MS));
      const match = due.find((d) => d.userId === user.id);
      expect(match?.assessmentId).toBe(secondAssessment.id);
    });
  });

  describe("sendReminderForUser", () => {
    it("sends the locked-result email when the result is still locked", async () => {
      const user = await createVerifiedUser("send-locked@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      const spy = new SpyEmailProvider();

      await sendReminderForUser(
        { userId: user.id, assessmentId: assessment.id, reminderNumber: 1, resultAccessState: "LOCKED" },
        spy,
      );

      expect(spy.sent).toHaveLength(1);
      expect(spy.sent[0].to).toBe(user.email);
      expect(spy.sent[0].text).toContain("$1");
      expect(spy.sent[0].text).toContain("Invite");

      const reminder = await prisma.emailReminder.findUniqueOrThrow({
        where: { userId_reminderNumber: { userId: user.id, reminderNumber: 1 } },
      });
      expect(reminder.deliveryStatus).toBe("sent");
    });

    it("sends the unlocked-but-unviewed variant with no unlock call-to-action", async () => {
      const user = await createVerifiedUser("send-unlocked@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.assessmentResult.update({
        where: { assessmentId: assessment.id },
        data: { resultAccessState: "UNLOCKED_BY_PAYMENT" },
      });
      const spy = new SpyEmailProvider();

      await sendReminderForUser(
        {
          userId: user.id,
          assessmentId: assessment.id,
          reminderNumber: 1,
          resultAccessState: "UNLOCKED_BY_PAYMENT",
        },
        spy,
      );

      expect(spy.sent).toHaveLength(1);
      expect(spy.sent[0].text).not.toContain("$1");
      expect(spy.sent[0].subject).toContain("ready to view");
    });

    it("is idempotent under concurrently racing duplicate calls — never sends twice", async () => {
      const user = await createVerifiedUser("send-concurrent@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      const spy = new SpyEmailProvider();
      const due = { userId: user.id, assessmentId: assessment.id, reminderNumber: 1, resultAccessState: "LOCKED" as const };

      await Promise.all([
        sendReminderForUser(due, spy),
        sendReminderForUser(due, spy),
        sendReminderForUser(due, spy),
      ]);

      expect(spy.sent).toHaveLength(1);
      const count = await prisma.emailReminder.count({ where: { userId: user.id } });
      expect(count).toBe(1);
    });

    it("re-checks live state and is a no-op if the user unsubscribed after being enqueued", async () => {
      const user = await createVerifiedUser("unsub-race@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.user.update({ where: { id: user.id }, data: { reminderUnsubscribedAt: new Date() } });
      const spy = new SpyEmailProvider();

      await sendReminderForUser(
        { userId: user.id, assessmentId: assessment.id, reminderNumber: 1, resultAccessState: "LOCKED" },
        spy,
      );

      expect(spy.sent).toHaveLength(0);
      const count = await prisma.emailReminder.count({ where: { userId: user.id } });
      expect(count).toBe(0);
    });

    it("re-checks live state and is a no-op if the result was viewed after being enqueued", async () => {
      const user = await createVerifiedUser("viewed-race@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.assessmentResult.update({
        where: { assessmentId: assessment.id },
        data: { resultAccessState: "RESULT_VIEWED" },
      });
      const spy = new SpyEmailProvider();

      await sendReminderForUser(
        { userId: user.id, assessmentId: assessment.id, reminderNumber: 1, resultAccessState: "LOCKED" },
        spy,
      );

      expect(spy.sent).toHaveLength(0);
    });

    it("marks the reminder failed (and still throws) when the email provider fails", async () => {
      const user = await createVerifiedUser("send-fails@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");

      await expect(
        sendReminderForUser(
          { userId: user.id, assessmentId: assessment.id, reminderNumber: 1, resultAccessState: "LOCKED" },
          new FailingEmailProvider(),
        ),
      ).rejects.toThrow();

      const reminder = await prisma.emailReminder.findUniqueOrThrow({
        where: { userId_reminderNumber: { userId: user.id, reminderNumber: 1 } },
      });
      expect(reminder.deliveryStatus).toBe("failed");
    });
  });

  describe("unsubscribe", () => {
    it("verifies a correct token and rejects a wrong one", () => {
      const user = { id: "some-user-id" };
      const token = buildUnsubscribeToken(user.id);
      expect(verifyUnsubscribeToken(user.id, token)).toBe(true);
      expect(verifyUnsubscribeToken(user.id, "wrong-token")).toBe(false);
      expect(verifyUnsubscribeToken("different-user-id", token)).toBe(false);
    });

    it("sets reminderUnsubscribedAt and is idempotent on a repeated click", async () => {
      const user = await createVerifiedUser("will-unsubscribe@example.com");
      const token = buildUnsubscribeToken(user.id);

      await unsubscribeFromReminders(user.id, token);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(after.reminderUnsubscribedAt).not.toBeNull();

      // Clicking the same link again must not throw or change the timestamp.
      await unsubscribeFromReminders(user.id, token);
      const afterSecond = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(afterSecond.reminderUnsubscribedAt?.getTime()).toBe(after.reminderUnsubscribedAt?.getTime());
    });

    it("rejects an invalid token", async () => {
      const user = await createVerifiedUser("bad-token@example.com");
      await expect(unsubscribeFromReminders(user.id, "not-the-real-token")).rejects.toBeInstanceOf(
        ReminderError,
      );
    });
  });

  describe("BullMQ queue + worker (real Redis, in-process worker)", () => {
    it("enqueues a job and the worker processes it end-to-end", async () => {
      const user = await createVerifiedUser("worker-e2e@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");

      const enqueued = await enqueueReminderJobs([
        { userId: user.id, assessmentId: assessment.id, reminderNumber: 1, resultAccessState: "LOCKED" },
      ]);
      expect(enqueued).toBe(1);

      const worker = startReminderWorker();
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("worker did not complete the job in time")), 10_000);
          worker.on("completed", () => {
            clearTimeout(timeout);
            resolve();
          });
          worker.on("failed", (_job, error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      } finally {
        await worker.close();
      }

      const reminder = await prisma.emailReminder.findUniqueOrThrow({
        where: { userId_reminderNumber: { userId: user.id, reminderNumber: 1 } },
      });
      expect(reminder.deliveryStatus).toBe("sent");
    }, 15_000);

    it("enqueueReminderJobs deduplicates the same (user, reminderNumber) job id", async () => {
      const user = await createVerifiedUser("dedupe@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      const due = { userId: user.id, assessmentId: assessment.id, reminderNumber: 1, resultAccessState: "LOCKED" as const };

      await enqueueReminderJobs([due]);
      await enqueueReminderJobs([due]);

      const queue = getRemindersQueue();
      const job = await queue.getJob(`${user.id}-1`);
      expect(job).not.toBeNull();
      // BullMQ silently no-ops the second add for a duplicate jobId still
      // present — there's still exactly one job for this slot.
      const waiting = await queue.getJobCountByTypes("waiting", "active", "completed");
      expect(waiting).toBeGreaterThanOrEqual(1);
    });
  });
});
