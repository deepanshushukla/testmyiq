import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createSession, getSessionUser, revokeSession } from "@/lib/auth/session";

describe("session issuance, verification, and revocation", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("issues a session that resolves back to its user", async () => {
    const user = await prisma.user.create({ data: { email: "session-user@example.com" } });

    const { rawToken } = await createSession(user.id, { userAgent: "vitest", ipAddress: "127.0.0.1" });
    const resolved = await getSessionUser(rawToken);

    expect(resolved?.id).toBe(user.id);
  });

  it("returns null for an unknown token", async () => {
    expect(await getSessionUser("not-a-real-token")).toBeNull();
  });

  it("returns null once a session is revoked", async () => {
    const user = await prisma.user.create({ data: { email: "revoke-user@example.com" } });
    const { rawToken } = await createSession(user.id, {});

    await revokeSession(rawToken);

    expect(await getSessionUser(rawToken)).toBeNull();
  });

  it("returns null for an expired session", async () => {
    const user = await prisma.user.create({ data: { email: "expired-user@example.com" } });
    const { rawToken } = await createSession(user.id, {});

    await prisma.userSession.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await getSessionUser(rawToken)).toBeNull();
  });
});
