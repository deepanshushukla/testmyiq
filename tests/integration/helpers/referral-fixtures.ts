import { prisma } from "@/lib/db/client";
import { registerUser } from "@/lib/auth/registration";
import { consumeOtp } from "@/lib/auth/verification";

/** Exhausts the free-tier cap so newly registered test users always land
 * on the LOCKED path — the one referral unlock actually matters for. */
export async function exhaustFreeTierCap() {
  await prisma.systemSetting.upsert({
    where: { key: "free_tier_allocation" },
    update: { value: { count: 10, cap: 10 } },
    create: { key: "free_tier_allocation", value: { count: 10, cap: 10 } },
  });
}

/**
 * Goes through the *real* registration + verification flow (not a
 * shortcut) so referral attribution (lib/auth/referral.ts, wired into
 * registerUser since Phase 2) happens exactly as it does for a real user.
 */
export async function registerAndVerifyUser(
  email: string,
  options: { referralCode?: string; registrationIp?: string } = {},
) {
  const { rawCode } = await registerUser({
    email,
    referralCode: options.referralCode,
    registrationIp: options.registrationIp,
  });
  return consumeOtp(email, rawCode);
}
