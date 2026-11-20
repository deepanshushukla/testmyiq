import { prisma } from "@/lib/db/client";

/**
 * Typed access to the `{ value: T }`-shaped system_settings rows (e.g.
 * `reminder_interval_days`, `referral_qualification_threshold`) — not the
 * ones with their own bespoke shape like `free_tier_allocation`
 * (see lib/auth/free-tier.ts for that one).
 */
export async function getSystemSettingValue<T>(key: string, fallback: T): Promise<T> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  if (!setting) return fallback;

  const value = setting.value as { value?: T } | null;
  return value?.value ?? fallback;
}
