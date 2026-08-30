import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // NOTE: 'query' logging is deliberately omitted even in development.
    // The keepalive below issues a `SELECT 1` every minute, which produced
    // hundreds of log lines that buried real errors during incident triage.
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Neon (serverless Postgres) suspends its compute after a few minutes of
// inactivity and drops idle TCP connections. Queries issued on those dead
// sockets then block until socket_timeout fires, which the browser surfaces
// as `TypeError: Failed to fetch`. Pinging the pool once a minute keeps the
// compute endpoint awake and proactively detects dead sockets so real
// requests get a healthy connection.
//
// Design notes (hard-learned during a network blip that took down user
// testing): the previous implementation fired 5 CONCURRENT pings — one per
// pooled connection (connection_limit=5). When the network dropped, every
// ping hung on a dead socket for up to socket_timeout (60s), checking out
// the ENTIRE pool and starving real requests, which then failed with
// "Timed out during query execution" and cascaded into auth 401s. The
// keepalive must never be able to monopolize the pool:
//   - ONE ping per tick, not one per connection.
//   - Skip the tick entirely if the previous ping is still in flight.
//   - Surface persistent failures with a rate-limited warning instead of
//     silently swallowing them, so a dead database stays visible in logs.
type KeepaliveTimer = { unref?: () => void };

const globalForKeepalive = globalThis as unknown & {
  prismaKeepalive?: KeepaliveTimer;
  prismaKeepaliveInFlight?: boolean;
  prismaKeepaliveLastWarnedAt?: number;
};

if (!globalForKeepalive.prismaKeepalive) {
  const WARN_INTERVAL_MS = 5 * 60_000;

  const keepalive = setInterval(() => {
    if (globalForKeepalive.prismaKeepaliveInFlight) return;
    globalForKeepalive.prismaKeepaliveInFlight = true;

    void db
      .$queryRaw`SELECT 1`
      .catch((error: unknown) => {
        const now = Date.now();
        const lastWarned = globalForKeepalive.prismaKeepaliveLastWarnedAt ?? 0;
        if (now - lastWarned > WARN_INTERVAL_MS) {
          globalForKeepalive.prismaKeepaliveLastWarnedAt = now;
          console.warn(
            '[db] Keepalive ping failed — database may be unreachable:',
            error instanceof Error ? error.message : error,
          );
        }
      })
      .finally(() => {
        globalForKeepalive.prismaKeepaliveInFlight = false;
      });
  }, 60_000) as unknown as KeepaliveTimer;

  // Never keep the Node process alive just for the keepalive timer.
  keepalive.unref?.();

  globalForKeepalive.prismaKeepalive = keepalive;
}

export default db;
