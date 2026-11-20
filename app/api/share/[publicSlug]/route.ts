import { NextResponse } from "next/server";
import { getPublicCertificateCard } from "@/lib/sharing/public-card";

/** Public, unauthenticated. The stable "public card fetch" contract — the
 * /u/[publicSlug] page and the OG image route both call
 * getPublicCertificateCard directly rather than looping back through
 * HTTP; this route exists for any other consumer (e.g. a client-side
 * share-preview) that needs the same visibility-filtered JSON. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicSlug: string }> },
) {
  const { publicSlug } = await params;
  const card = await getPublicCertificateCard(publicSlug);
  if (!card) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(card);
}
