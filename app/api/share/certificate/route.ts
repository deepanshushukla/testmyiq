import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { getOrCreateCertificate } from "@/lib/sharing/certificate";
import { handleShareRouteError } from "@/lib/http/share-response";

const bodySchema = z.object({
  assessmentId: z.string().uuid(),
  visibilitySettings: z.object({
    showScore: z.boolean(),
    showCategoryBreakdown: z.boolean(),
    showBadges: z.boolean(),
    indexable: z.boolean(),
  }),
});

/** Create-or-update a shareable certificate for an already-unlocked
 * result. See lib/sharing/certificate.ts for the idempotency contract —
 * the publicSlug never changes across repeat calls, only the settings. */
export async function POST(request: NextRequest) {
  try {
    const user = assertAuthenticated(await getCurrentUser());

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { assessmentId, visibilitySettings } = parsed.data;
    const handle = await getOrCreateCertificate(assessmentId, user.id, visibilitySettings);

    return NextResponse.json(handle);
  } catch (error) {
    return handleShareRouteError(error);
  }
}
