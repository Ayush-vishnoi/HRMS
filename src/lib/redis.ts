import Redis from 'ioredis';

export const CACHE_TTL_SECONDS = {
  employeeDirectory: 5 * 60,
  dashboardAnalytics: 5 * 60,
  organizationStructure: 60 * 60,
} as const;

export const cacheKeys = {
  employeesDirectory: 'hrms:v1:employees:directory:global',
  dashboardAnalytics: 'hrms:v1:dashboard:analytics:admin',
  organization: {
    departments: (organizationId: string) => `hrms:v1:organization:${organizationId}:departments`,
    designations: (organizationId: string) => `hrms:v1:organization:${organizationId}:designations`,
    workLocations: (organizationId: string) => `hrms:v1:organization:${organizationId}:work-locations`,
    businessUnits: (organizationId: string) => `hrms:v1:organization:${organizationId}:business-units`,
    structure: (organizationId: string) => `hrms:v1:organization:${organizationId}:structure`,
  },
} as const;

let redis: Redis | null = null;
let warnedMissingUrl = false;
let warnedInvalidUrl = false;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    if (!warnedMissingUrl) {
      console.warn('[redis] REDIS_URL is not configured; using database queries only.');
      warnedMissingUrl = true;
    }
    return null;
  }

  if (!redis) {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'redis:' && parsedUrl.protocol !== 'rediss:') {
        throw new Error(`unsupported protocol ${parsedUrl.protocol}`);
      }

      redis = new Redis(url, {
        lazyConnect: true,
        connectTimeout: 1000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        // Upstash (and most managed Redis providers) close idle TCP
        // connections; TCP keepalive probes keep the socket warm.
        keepAlive: 30_000,
      });
      redis.on('error', (error) => {
        console.warn('[redis] Redis unavailable; falling back to database queries.', error.message);
      });
    } catch (error) {
      if (!warnedInvalidUrl) {
        console.warn('[redis] REDIS_URL is invalid; using database queries only.', error);
        warnedInvalidUrl = true;
      }
      return null;
    }
  }

  return redis;
}

// With lazyConnect + enableOfflineQueue: false, issuing a command on a
// disconnected client rejects immediately ("Stream isn't writeable"). Wait
// for the connection (or an auto-reconnect) to become ready before running
// cache commands, and bail out after a short timeout so requests never hang.
function waitForReady(client: Redis, timeoutMs = 1500): Promise<boolean> {
  if (client.status === 'ready') return Promise.resolve(true);

  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      client.removeListener('ready', onReady);
      client.removeListener('end', onEnd);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    const onReady = () => finish(true);
    const onEnd = () => finish(false);
    client.once('ready', onReady);
    client.once('end', onEnd);
  });
}

async function ensureConnected(client: Redis): Promise<boolean> {
  if (client.status === 'ready') return true;

  // Not connected yet (lazyConnect) or gave up entirely: start connecting.
  if (client.status === 'wait' || client.status === 'end') {
    try {
      await client.connect();
    } catch {
      // Already connecting from a concurrent caller, or the connect failed;
      // fall through and let waitForReady decide.
    }
  }

  return waitForReady(client);
}

export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    if (!(await ensureConnected(client))) return null;
    const value = await client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.warn(`[redis] GET failed for ${key}; using database query.`, error);
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    if (!(await ensureConnected(client))) return;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    console.warn(`[redis] SET failed for ${key}; continuing without cache.`, error);
  }
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const client = getRedis();
  if (!client) return;

  try {
    if (!(await ensureConnected(client))) return;
    await client.del(...keys);
  } catch (error) {
    console.warn(`[redis] Invalidation failed for ${keys.join(', ')}; continuing.`, error);
  }
}

export const invalidateEmployeeDirectory = () => invalidateCache(cacheKeys.employeesDirectory);
export const invalidateDashboardAnalytics = () => invalidateCache(cacheKeys.dashboardAnalytics);

export function organizationCacheKeys(organizationId: string): string[] {
  return [
    cacheKeys.organization.departments(organizationId),
    cacheKeys.organization.designations(organizationId),
    cacheKeys.organization.workLocations(organizationId),
    cacheKeys.organization.businessUnits(organizationId),
    cacheKeys.organization.structure(organizationId),
  ];
}

export const invalidateOrganization = (organizationId: string) =>
  invalidateCache(...organizationCacheKeys(organizationId));
