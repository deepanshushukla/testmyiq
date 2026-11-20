import Link from "next/link";

/**
 * Plain links, not buttons with onClick — the browser needs to actually
 * navigate to /start so the server can set the state/PKCE cookies and
 * issue a real redirect to the provider; a fetch() call couldn't follow
 * that redirect chain the same way. Works without JavaScript, same as
 * every other link-based auth flow already in this app (/r/[code]).
 * `referralCode` (from `?ref=` on /register) is forwarded so OAuth
 * signups attribute a referral exactly like the email path does.
 */
export function OAuthButtons({ referralCode }: { referralCode?: string }) {
  const suffix = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : "";

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/api/auth/oauth/google/start${suffix}`}
        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Continue with Google
      </Link>
      <Link
        href={`/api/auth/oauth/linkedin/start${suffix}`}
        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Continue with LinkedIn
      </Link>
    </div>
  );
}
