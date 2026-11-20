import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Referral capture is a query param, not a cookie — the register page
 * (app/(auth)/register/RegisterForm.tsx) already reads `?ref=` directly
 * and sends it as `referralCode` on signup (decided in Phase 2, before
 * this page existed). This is just the shareable short link into that.
 */
export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/register?ref=${encodeURIComponent(code)}`);
}
