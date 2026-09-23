import type { EmploymentStatus } from '@prisma/client';

/**
 * Employment statuses that revoke login/API access. For these statuses,
 * `lockedUntil` is interpreted as the END of any grace window: a future
 * `lockedUntil` still permits access (e.g. the post-relieving window of a
 * normal resignation), while a past or absent `lockedUntil` means access is
 * cut off immediately. Immediate termination sets status `Terminated` with
 * `lockedUntil = now`, so access is revoked at once.
 */
export const LOCKOUT_STATUSES: EmploymentStatus[] = ['Exited', 'Terminated'];
