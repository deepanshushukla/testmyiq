import type { User } from "@prisma/client";
import { getSessionUser } from "./session";
import { readSessionCookie } from "./cookies";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Admin access required") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Reads the session cookie from the current request context. Only
 * callable from a Route Handler or Server Component — not unit-testable
 * in isolation, which is exactly why the RBAC decision itself lives in
 * assertAdmin below, a plain function that takes a user and is. */
export async function getCurrentUser(): Promise<User | null> {
  const rawToken = await readSessionCookie();
  return getSessionUser(rawToken);
}

export function assertAdmin(user: User | null): User {
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.role !== "ADMIN") {
    throw new ForbiddenError();
  }
  return user;
}

/** For endpoints any logged-in user may call (assessment start/state/
 * answer/submit) — no role check, just "must be signed in." */
export function assertAuthenticated(user: User | null): User {
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
