import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/seo/constants";
import { getPublicCertificateCard } from "@/lib/sharing/public-card";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Same visibility gate as the page itself (lib/sharing/public-card.ts) —
 * the image is generated from the same filtered payload, never the raw
 * result, so a hidden score can't leak into the OG image either.
 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;
  const card = await getPublicCertificateCard(publicSlug);

  const headline = card
    ? card.estimatedScore !== undefined
      ? `${Math.round(card.estimatedScore)} — ${card.performanceLabel}`
      : "Assessment complete"
    : "Share card not found";
  const subtitle = card ? `${card.displayName}'s cognitive assessment` : APP_NAME;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          backgroundColor: "#4f46e5",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.85 }}>{APP_NAME}</div>
        <div style={{ fontSize: 72, fontWeight: 700 }}>{headline}</div>
        <div style={{ fontSize: 32, opacity: 0.9 }}>{subtitle}</div>
      </div>
    ),
    { ...size },
  );
}
