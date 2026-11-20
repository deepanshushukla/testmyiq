-- Phase 9: stop condition for weekly reminders (requirement.txt §2.4).
ALTER TABLE "User" ADD COLUMN "reminderUnsubscribedAt" TIMESTAMP(3);
