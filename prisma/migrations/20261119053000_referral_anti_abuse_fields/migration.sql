-- Phase 7 referral anti-abuse: capture registration IP (for the
-- same-IP heuristic) and a flag on ReferralQualification for admin review.
-- docs/REFERRAL_RULES.md §4.3.

ALTER TABLE "User" ADD COLUMN "registrationIp" TEXT;
ALTER TABLE "ReferralQualification" ADD COLUMN "flaggedSuspicious" BOOLEAN NOT NULL DEFAULT false;
