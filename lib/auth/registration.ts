import { prisma } from "@/lib/db/client";
import { attributeReferral } from "./referral";
import { issueVerificationPair } from "./verification";
import { AuthError } from "./errors";

export async function registerUser(input: {
  email: string;
  displayName?: string;
  referralCode?: string;
  registrationIp?: string;
}) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError(
      "already_registered",
      "An account with this email already exists. Try logging in instead.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        displayName: input.displayName?.trim() || null,
        registrationIp: input.registrationIp ?? null,
      },
    });

    await attributeReferral(tx, user.id, input.referralCode?.trim() || null);

    const { rawCode, rawToken, expiresAt } = await issueVerificationPair(tx, user.id);

    return { user, rawCode, rawToken, expiresAt };
  });
}
