/**
 * requirement.txt Part 8 says only "include user-approved information" —
 * these 4 fields are the concrete, documented shape of that approval
 * (docs/DATABASE.md "shareable_certificates" note). `indexable` is the
 * page-level robots directive for /u/[publicSlug]; it defaults to false
 * (opt-in), matching docs/API.md §6's "noindex unless opted in".
 */
export type CertificateVisibilitySettings = {
  showScore: boolean;
  showCategoryBreakdown: boolean;
  showBadges: boolean;
  indexable: boolean;
};
