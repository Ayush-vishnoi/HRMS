import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Neon (serverless Postgres) suspends its compute after a few minutes of
// inactivity and drops idle TCP connections. Queries issued on those dead
// sockets then block until the OS-level TCP retransmission timeout (~15 min)
// fires, which the browser surfaces as `TypeError: Failed to fetch`.
// Pinging the pool once a minute keeps every pooled connection warm and
// proactively evicts dead ones so real requests get a healthy connection.
type KeepaliveTimer = { unref?: () => void };

const globalForKeepalive = globalThis as unknown & { prismaKeepalive?: KeepaliveTimer };

if (!globalForKeepalive.prismaKeepalive) {
  // 5 concurrent pings touch every pooled connection (the pool hands each
  // concurrent checkout a distinct connection). Keep this in sync with
  // `connection_limit` in DATABASE_URL.
  const keepalive = setInterval(() => {
    void Promise.allSettled(
      Array.from({ length: 5 }, () => db.$queryRaw`SELECT 1`),
    );
  }, 60_000) as unknown as KeepaliveTimer;

  // Never keep the Node process alive just for the keepalive timer.
  keepalive.unref?.();

  globalForKeepalive.prismaKeepalive = keepalive;
}

export default db;
