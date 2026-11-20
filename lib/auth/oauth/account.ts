import { Prisma, type OAuthProvider, type User } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { allocateFreeTierSlot } from "../free-tier";
import { attributeReferral } from "../referral";

/**
 * Transactional find-or-create, mirroring
 * `lib/auth/verification.ts`'s `consumeVerificationRecord` structure on
 * purpose: free-tier allocation must happen inside the same transaction
 * as the "this account just became verified" moment, whichever of the
 * three paths below that turns out to be (docs/DATABASE.md §3) — reusing
 * `allocateFreeTierSlot` and `attributeReferral` directly rather than
 * re-deriving either guarantee for OAuth specifically.
 *
 * Race safety: two concurrent calls for the *same* provider account (a
 * double-fired callback — back button, double-click, network retry) can
 * both miss the "already exists" check and race on `User.email`'s or
 * `OAuthAccount`'s unique constraint. The loser's `P2002` is caught below
 * and resolved by re-reading what the winner just committed, same
 * fetch-after-conflict pattern as `lib/referrals/code.ts` and
 * `lib/sharing/certificate.ts`. **Known, accepted gap**: two *different*
 * providers linking the same still-unverified email at the exact same
 * instant could each allocate a free-tier slot before either commits —
 * narrow enough (two simultaneous OAuth tabs for a brand-new, unverified
 * account) that it's flagged rather than solved, same class of documented
 * gap as `docs/ARCHITECTURE.md`'s `payment-webhook-reconcile` note.
 */
export async function findOrCreateOAuthUser(params: {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  displayName: string | null;
  referralCode: string | null;
  registrationIp: string | null;
}): Promise<User> {
  try {
    return await runFindOrCreate(params);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingAccount = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: params.provider,
            providerAccountId: params.providerAccountId,
          },
        },
        include: { user: true },
      });
      if (existingAccount) {
        return existingAccount.user;
      }

      const existingUserByEmail = await prisma.user.findUnique({ where: { email: params.email } });
      if (existingUserByEmail) {
        return existingUserByEmail;
      }
    }
    throw error;
  }
}

async function runFindOrCreate(params: {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  displayName: string | null;
  referralCode: string | null;
  registrationIp: string | null;
}): Promise<User> {
  const { provider, providerAccountId, email, displayName, referralCode, registrationIp } = params;

  return prisma.$transaction(async (tx) => {
    // 1. Repeat login — same provider account already linked.
    const existingAccount = await tx.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
    if (existingAccount) {
      return existingAccount.user;
    }

    const existingUserByEmail = await tx.user.findUnique({ where: { email } });

    // 2. Linking this provider to an existing email-registered account.
    if (existingUserByEmail) {
      let user = existingUserByEmail;

      if (!user.emailVerifiedAt) {
        // This OAuth sign-in *is* their verification moment — the email
        // is provider-attested, so this is exactly equivalent to
        // consuming an OTP, just via a different channel.
        const rank = await allocateFreeTierSlot(tx);
        const isFreeTier = rank !== null;
        user = await tx.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date(), isFreeTierEligible: isFreeTier, freeTierRank: rank },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: isFreeTier ? "FREE_TIER_ALLOCATED" : "EMAIL_VERIFIED",
            entityType: "User",
            entityId: user.id,
            metadata: { via: provider, ...(isFreeTier ? { rank } : {}) },
          },
        });
      }

      await tx.oAuthAccount.create({ data: { userId: user.id, provider, providerAccountId, email } });
      return user;
    }

    // 3. Brand-new account — same shape as lib/auth/registration.ts's
    // registerUser, minus the OTP/magic-link issuance (nothing to verify
    // later; the provider already verified the email).
    const createdUser = await tx.user.create({
      data: {
        email,
        displayName: displayName?.trim() || null,
        registrationIp,
        emailVerifiedAt: new Date(),
      },
    });

    await attributeReferral(tx, createdUser.id, referralCode?.trim() || null);

    const rank = await allocateFreeTierSlot(tx);
    const isFreeTier = rank !== null;
    const finalUser = await tx.user.update({
      where: { id: createdUser.id },
      data: { isFreeTierEligible: isFreeTier, freeTierRank: rank },
    });

    await tx.oAuthAccount.create({
      data: { userId: createdUser.id, provider, providerAccountId, email },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: createdUser.id,
        action: isFreeTier ? "FREE_TIER_ALLOCATED" : "USER_REGISTERED_OAUTH",
        entityType: "User",
        entityId: createdUser.id,
        metadata: { via: provider, ...(isFreeTier ? { rank } : {}) },
      },
    });

    return finalUser;
  });
}
