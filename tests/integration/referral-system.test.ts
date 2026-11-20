import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { getOrCreateReferralCode } from "@/lib/referrals/code";
import { getReferralProgress } from "@/lib/referrals/progress";
import { checkAndQualifyReferral } from "@/lib/referrals/qualification";
import { tryUnlockViaReferral } from "@/lib/referrals/unlock";
import { disqualifyReferral, listReferralsForAdmin } from "@/lib/referrals/admin";
import {
  createVerifiedUser,
  seedAssessmentFixtures,
  startAndSubmitAssessment,
} from "./helpers/assessment-fixtures";
import { exhaustFreeTierCap, registerAndVerifyUser } from "./helpers/referral-fixtures";

describe("referral system", () => {
  beforeEach(async () => {
    await seedAssessmentFixtures();
    await exhaustFreeTierCap();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("getOrCreateReferralCode is idempotent", async () => {
    const user = await createVerifiedUser("code-owner@example.com");
    const first = await getOrCreateReferralCode(user.id);
    const second = await getOrCreateReferralCode(user.id);

    expect(second).toBe(first);
    const count = await prisma.referralCode.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it("attributes a referral through the real registration flow and leaves it PENDING", async () => {
    const referrer = await createVerifiedUser("referrer-attr@example.com");
    const code = await getOrCreateReferralCode(referrer.id);

    const referred = await registerAndVerifyUser("referred-attr@example.com", {
      referralCode: code,
    });

    const referral = await prisma.referral.findUnique({
      where: { referredUserId: referred.id },
      include: { qualification: true },
    });
    expect(referral?.referrerUserId).toBe(referrer.id);
    expect(referral?.qualification?.status).toBe("PENDING");
  });

  it("does not qualify a referral while the referred user's assessment is only EXPIRED, never SUBMITTED", async () => {
    const referrer = await createVerifiedUser("referrer-expired@example.com");
    const code = await getOrCreateReferralCode(referrer.id);
    const referred = await registerAndVerifyUser("referred-expired@example.com", {
      referralCode: code,
    });

    // Simulate an attempt that only ever expired, never a real submit.
    await prisma.assessment.create({
      data: {
        userId: referred.id,
        templateId: (await prisma.assessmentTemplate.findFirstOrThrow()).id,
        status: "EXPIRED",
        startedAt: new Date(Date.now() - 2000),
        expiresAt: new Date(Date.now() - 1000),
        submittedAt: new Date(),
      },
    });

    await checkAndQualifyReferral(referred.id);

    const qualification = await prisma.referralQualification.findFirstOrThrow({
      where: { referral: { referredUserId: referred.id } },
    });
    expect(qualification.status).toBe("PENDING");
  });

  it("qualifies a referral once the referred user genuinely submits their assessment", async () => {
    const referrer = await createVerifiedUser("referrer-qualify@example.com");
    const code = await getOrCreateReferralCode(referrer.id);
    const referred = await registerAndVerifyUser("referred-qualify@example.com", {
      referralCode: code,
    });

    await startAndSubmitAssessment(referred.id, "all-correct");

    const qualification = await prisma.referralQualification.findFirstOrThrow({
      where: { referral: { referredUserId: referred.id } },
    });
    expect(qualification.status).toBe("QUALIFIED");
    expect(qualification.qualifiedAt).not.toBeNull();
  });

  it("flags (but still qualifies) a referral where referrer and referred share a registration IP", async () => {
    const referrer = await registerAndVerifyUser("referrer-sameip@example.com", {
      registrationIp: "203.0.113.5",
    });
    const code = await getOrCreateReferralCode(referrer.id);
    const referred = await registerAndVerifyUser("referred-sameip@example.com", {
      referralCode: code,
      registrationIp: "203.0.113.5",
    });

    await startAndSubmitAssessment(referred.id, "all-correct");

    const qualification = await prisma.referralQualification.findFirstOrThrow({
      where: { referral: { referredUserId: referred.id } },
    });
    expect(qualification.status).toBe("QUALIFIED");
    expect(qualification.flaggedSuspicious).toBe(true);
  });

  it("does not flag a referral where referrer and referred have different registration IPs", async () => {
    const referrer = await registerAndVerifyUser("referrer-diffip@example.com", {
      registrationIp: "203.0.113.5",
    });
    const code = await getOrCreateReferralCode(referrer.id);
    const referred = await registerAndVerifyUser("referred-diffip@example.com", {
      referralCode: code,
      registrationIp: "198.51.100.9",
    });

    await startAndSubmitAssessment(referred.id, "all-correct");

    const qualification = await prisma.referralQualification.findFirstOrThrow({
      where: { referral: { referredUserId: referred.id } },
    });
    expect(qualification.flaggedSuspicious).toBe(false);
  });

  it("acceptance criterion: two qualified referrals automatically unlock the referrer's existing LOCKED result, no manual step", async () => {
    const referrer = await createVerifiedUser("acceptance-referrer@example.com");
    const code = await getOrCreateReferralCode(referrer.id);

    // Referrer takes their own assessment first — lands LOCKED.
    const referrerAssessment = await startAndSubmitAssessment(referrer.id, "all-incorrect");
    const resultBefore = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: referrerAssessment.id },
    });
    expect(resultBefore.resultAccessState).toBe("LOCKED");

    const friend1 = await registerAndVerifyUser("friend1@example.com", { referralCode: code });
    await startAndSubmitAssessment(friend1.id, "all-correct");

    const progressAfterOne = await getReferralProgress(referrer.id);
    expect(progressAfterOne.qualifiedCount).toBe(1);

    const resultAfterOne = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: referrerAssessment.id },
    });
    expect(resultAfterOne.resultAccessState).toBe("LOCKED"); // not yet — only 1 of 2

    const friend2 = await registerAndVerifyUser("friend2@example.com", { referralCode: code });
    await startAndSubmitAssessment(friend2.id, "all-correct");

    const progressAfterTwo = await getReferralProgress(referrer.id);
    expect(progressAfterTwo.qualifiedCount).toBe(2);

    const resultAfterTwo = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: referrerAssessment.id },
    });
    expect(resultAfterTwo.resultAccessState).toBe("UNLOCKED_BY_REFERRAL");

    const unlock = await prisma.resultUnlock.findUnique({
      where: { assessmentResultId: resultAfterTwo.id },
    });
    expect(unlock?.unlockMethod).toBe("REFERRAL");
  });

  it("unlocks immediately at result-creation time if the referrer already had 2 qualified referrals before ever taking their own assessment", async () => {
    const referrer = await createVerifiedUser("already-qualified-referrer@example.com");
    const code = await getOrCreateReferralCode(referrer.id);

    const friend1 = await registerAndVerifyUser("preq-friend1@example.com", { referralCode: code });
    await startAndSubmitAssessment(friend1.id, "all-correct");
    const friend2 = await registerAndVerifyUser("preq-friend2@example.com", { referralCode: code });
    await startAndSubmitAssessment(friend2.id, "all-correct");

    expect((await getReferralProgress(referrer.id)).qualifiedCount).toBe(2);

    // Only now does the referrer take their own assessment.
    const referrerAssessment = await startAndSubmitAssessment(referrer.id, "all-incorrect");
    const result = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: referrerAssessment.id },
    });

    expect(result.resultAccessState).toBe("UNLOCKED_BY_REFERRAL");
    const unlock = await prisma.resultUnlock.findUnique({ where: { assessmentResultId: result.id } });
    expect(unlock).not.toBeNull();
  });

  it("tryUnlockViaReferral is idempotent under concurrent duplicate calls", async () => {
    const referrer = await createVerifiedUser("idempotent-unlock-referrer@example.com");
    const code = await getOrCreateReferralCode(referrer.id);
    const referrerAssessment = await startAndSubmitAssessment(referrer.id, "all-incorrect");

    for (const email of ["dupe-friend1@example.com", "dupe-friend2@example.com"]) {
      const friend = await registerAndVerifyUser(email, { referralCode: code });
      await startAndSubmitAssessment(friend.id, "all-correct");
    }

    // Both already triggered an unlock via the qualification hook; call it
    // again concurrently a few more times to simulate a retried job.
    await Promise.all([
      tryUnlockViaReferral(referrer.id),
      tryUnlockViaReferral(referrer.id),
      tryUnlockViaReferral(referrer.id),
    ]);

    const result = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: referrerAssessment.id },
    });
    expect(result.resultAccessState).toBe("UNLOCKED_BY_REFERRAL");

    const unlockCount = await prisma.resultUnlock.count({ where: { assessmentResultId: result.id } });
    expect(unlockCount).toBe(1);
  });

  it("admin disqualify is audited and does not revoke an unlock the referral already contributed to", async () => {
    const referrer = await createVerifiedUser("disqualify-referrer@example.com");
    const code = await getOrCreateReferralCode(referrer.id);
    const referrerAssessment = await startAndSubmitAssessment(referrer.id, "all-incorrect");

    const friendIds: string[] = [];
    for (const email of ["dq-friend1@example.com", "dq-friend2@example.com"]) {
      const friend = await registerAndVerifyUser(email, { referralCode: code });
      await startAndSubmitAssessment(friend.id, "all-correct");
      friendIds.push(friend.id);
    }

    const resultBefore = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: referrerAssessment.id },
    });
    expect(resultBefore.resultAccessState).toBe("UNLOCKED_BY_REFERRAL");

    const [qualificationToRevoke] = await prisma.referralQualification.findMany({
      where: { referral: { referredUserId: friendIds[0] } },
    });

    const admin = await createVerifiedUser("referral-admin@example.com");
    await disqualifyReferral(qualificationToRevoke.id, admin.id, "Suspected fraud ring");

    const updatedQualification = await prisma.referralQualification.findUniqueOrThrow({
      where: { id: qualificationToRevoke.id },
    });
    expect(updatedQualification.status).toBe("DISQUALIFIED");
    expect(updatedQualification.disqualifiedReason).toBe("Suspected fraud ring");

    const auditLog = await prisma.auditLog.findFirst({
      where: { action: "REFERRAL_DISQUALIFIED", entityId: qualificationToRevoke.id },
    });
    expect(auditLog?.actorUserId).toBe(admin.id);

    // Existing qualified referrals (and the unlock they already granted)
    // must never be lost, per spec.
    const resultAfter = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: referrerAssessment.id },
    });
    expect(resultAfter.resultAccessState).toBe("UNLOCKED_BY_REFERRAL");
    const unlockStillExists = await prisma.resultUnlock.findUnique({
      where: { assessmentResultId: resultAfter.id },
    });
    expect(unlockStillExists).not.toBeNull();
  });

  it("admin referral list surfaces referrer/referred/status for review", async () => {
    const referrer = await createVerifiedUser("list-referrer@example.com");
    const code = await getOrCreateReferralCode(referrer.id);
    await registerAndVerifyUser("list-friend@example.com", { referralCode: code });

    const referrals = await listReferralsForAdmin();
    const match = referrals.find((referral) => referral.referrer.email === "list-referrer@example.com");

    expect(match?.referred.email).toBe("list-friend@example.com");
    expect(match?.qualification?.status).toBe("PENDING");
  });
});
