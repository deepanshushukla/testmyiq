export function buildVerificationEmail(params: {
  code: string;
  magicLinkUrl: string;
  appName: string;
}) {
  const { code, magicLinkUrl, appName } = params;

  return {
    subject: `Your ${appName} verification code`,
    text: `Your verification code is ${code}. It expires in 15 minutes.\n\nOr use this one-click link instead: ${magicLinkUrl}`,
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p><p>Or <a href="${magicLinkUrl}">click here to verify instantly</a>.</p>`,
  };
}

/**
 * Sent to a user whose result is still locked (requirement.txt §2.4):
 * "remind them of two options — unlock instantly for $1, or invite two
 * friends to unlock for free." Never call this for an already-unlocked
 * result — use `buildUnlockedReminderEmail` instead (see
 * `lib/reminders/send.ts`, which picks the variant at send time).
 */
export function buildLockedReminderEmail(params: {
  resultsUrl: string;
  unsubscribeUrl: string;
  appName: string;
}) {
  const { resultsUrl, unsubscribeUrl, appName } = params;

  return {
    subject: `Your ${appName} results are waiting`,
    text: [
      "Your results are ready, but still locked. Two ways to unlock them:",
      "  1. Unlock instantly for $1.",
      "  2. Invite two friends — unlock free once they register, verify, and complete their own assessment.",
      "",
      `View your results: ${resultsUrl}`,
      "",
      `Don't want these reminders? Unsubscribe: ${unsubscribeUrl}`,
    ].join("\n"),
    html: `<p>Your results are ready, but still locked. Two ways to unlock them:</p>
<ol><li>Unlock instantly for $1.</li><li>Invite two friends — unlock free once they register, verify, and complete their own assessment.</li></ol>
<p><a href="${resultsUrl}">View your results</a></p>
<p style="color:#888;font-size:12px;">Don't want these reminders? <a href="${unsubscribeUrl}">Unsubscribe</a>.</p>`,
  };
}

/** Sent to a user who's already unlocked their result but never viewed it
 * — the spec's two stop conditions ("unlocked AND viewed") are
 * independent, so merely unlocking doesn't stop reminders on its own. No
 * unlock call-to-action here since there's nothing left to unlock. */
export function buildUnlockedReminderEmail(params: {
  resultsUrl: string;
  unsubscribeUrl: string;
  appName: string;
}) {
  const { resultsUrl, unsubscribeUrl, appName } = params;

  return {
    subject: `Your ${appName} results are ready to view`,
    text: [
      "Your results are unlocked and ready — you just haven't looked yet.",
      "",
      `View your results: ${resultsUrl}`,
      "",
      `Don't want these reminders? Unsubscribe: ${unsubscribeUrl}`,
    ].join("\n"),
    html: `<p>Your results are unlocked and ready — you just haven't looked yet.</p>
<p><a href="${resultsUrl}">View your results</a></p>
<p style="color:#888;font-size:12px;">Don't want these reminders? <a href="${unsubscribeUrl}">Unsubscribe</a>.</p>`,
  };
}

/** Sent once a payment webhook actually unlocks a result (requirement.txt
 * §2.2 step 8) — never on a frontend "success" redirect, since that's not
 * proof the payment went through. See `lib/payments/webhook.ts`. */
export function buildPaymentConfirmationEmail(params: {
  resultsUrl: string;
  appName: string;
}) {
  const { resultsUrl, appName } = params;

  return {
    subject: `Payment received — your ${appName} results are unlocked`,
    text: `Your $1 payment was successful and your results are now unlocked.\n\nView your results: ${resultsUrl}`,
    html: `<p>Your $1 payment was successful and your results are now unlocked.</p><p><a href="${resultsUrl}">View your results</a></p>`,
  };
}
