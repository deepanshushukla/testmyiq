import type { Prisma, PrismaClient } from "@prisma/client";

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Atomically allocates the next free-tier slot (docs/DATABASE.md §3). Must
 * be called inside the same transaction that sets the user's
 * emailVerifiedAt, never on a separate read-then-write path.
 *
 * Returns the 1-based rank (1..cap) if a slot was allocated, or null if the
 * cap has already been reached. PostgreSQL's row-level lock on this single
 * settings row serializes concurrent callers, so this holds under
 * concurrency regardless of application-level bugs elsewhere.
 */
export async function allocateFreeTierSlot(client: Client): Promise<number | null> {
  const rows = await client.$queryRaw<{ new_count: number }[]>`
    UPDATE "SystemSetting"
    SET value = jsonb_set(value, '{count}', (((value->>'count')::int + 1))::text::jsonb)
    WHERE key = 'free_tier_allocation'
      AND (value->>'count')::int < (value->>'cap')::int
    RETURNING (value->>'count')::int AS new_count
  `;

  return rows.length > 0 ? rows[0].new_count : null;
}
