import { hash, verify, argon2id } from 'argon2';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { AUTH_SESSION_MAX_AGE_SECONDS } from '@/lib/auth-cookies';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const PASSWORD_HASH_OPTIONS = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const dummyPasswordHash = hash(randomBytes(32), PASSWORD_HASH_OPTIONS);

export function hashCredentialPassword(password: string) {
  return hash(password, PASSWORD_HASH_OPTIONS);
}

export type CredentialResult =
  | { ok: true; sessionToken: string; expires: Date }
  | { ok: false; reason: 'invalid' | 'locked' };

export async function authenticateCredentials(
  rawIdentifier: string,
  password: string,
): Promise<CredentialResult> {
  const identifier = rawIdentifier.trim();
  const normalizedEmail = identifier.toLowerCase();
  const normalizedEmployeeCode = identifier.toUpperCase();
  const employee = await db.employee.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { employeeCode: normalizedEmployeeCode }],
    },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  const now = new Date();
  const isLocked = Boolean(employee?.lockedUntil && employee.lockedUntil > now);
  const canAuthenticate = Boolean(employee && employee.status !== 'Offboarded' && employee.passwordHash);
  const passwordHash = employee?.passwordHash ?? (await dummyPasswordHash);
  const passwordMatches = await verify(passwordHash, password).catch(() => false);

  if (canAuthenticate && isLocked) return { ok: false, reason: 'locked' };

  if (!employee || !canAuthenticate || !passwordMatches) {
    if (employee && canAuthenticate) {
      const failedLoginAttempts = employee.failedLoginAttempts + 1;
      await db.employee.update({
        where: { id: employee.id },
        data: {
          failedLoginAttempts,
          lockedUntil:
            failedLoginAttempts >= MAX_FAILED_ATTEMPTS
              ? new Date(now.getTime() + LOCK_DURATION_MS)
              : null,
        },
      });
    }

    return { ok: false, reason: 'invalid' };
  }

  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(now.getTime() + AUTH_SESSION_MAX_AGE_SECONDS * 1000);

  await db.$transaction([
    db.employee.update({
      where: { id: employee.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    }),
    db.authSession.create({
      data: {
        sessionToken,
        employeeId: employee.id,
        expires,
      },
    }),
  ]);

  return { ok: true, sessionToken, expires };
}
