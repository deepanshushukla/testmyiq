import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { generateOpaqueToken, hashWithSecret } from "./crypto";

export const SESSION_COOKIE_NAME = "iq_test_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

type Client = PrismaClient | Prisma.TransactionClient;

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null },
  client: Client = prisma,
) {
  const rawToken = generateOpaqueToken();
  const sessionTokenHash = hashWithSecret(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await client.userSession.create({
    data: {
      userId,
      sessionTokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function getSessionUser(rawToken: string | undefined) {
  if (!rawToken) return null;

  const sessionTokenHash = hashWithSecret(rawToken);
  const session = await prisma.userSession.findUnique({
    where: { sessionTokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.deletedAt) return null;

  return session.user;
}

export async function revokeSession(rawToken: string) {
  const sessionTokenHash = hashWithSecret(rawToken);
  await prisma.userSession.updateMany({
    where: { sessionTokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
