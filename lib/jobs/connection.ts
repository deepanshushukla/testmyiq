import Redis from "ioredis";

let connection: Redis | null = null;

/**
 * A dedicated connection, separate from `lib/rate-limit`'s — BullMQ
 * requires `maxRetriesPerRequest: null` on its Redis connection (so it can
 * manage its own blocking-command retry behavior), which would be the
 * wrong setting for the rate limiter's plain `INCR`/`EXPIRE` calls.
 */
export function getJobsRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}
